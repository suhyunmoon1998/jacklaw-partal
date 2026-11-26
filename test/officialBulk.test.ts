import { readFileSync } from 'fs'
import path from 'path'
import { deflateRawSync } from 'zlib'
import { afterEach, describe, expect, it, vi } from 'vitest'
import statuteData from '@/lib/authority/statutes.json'
import {
  filedText,
  findCentralDirectory,
  lobToText,
  normalizeSectionKey,
  openRemoteZip,
  parseCodeNames,
  parseLawSectionRow,
  readZipEntry,
  sectionsChangedByBill,
  sha256,
} from '@/lib/authority/officialBulk'

/**
 * The bulk-data reader, with no network: a real LAW_SECTION_TBL row and its
 * .lob as the Legislature served them on 2026-11-23 (pubinfo_2025.zip), and a
 * small zip built here and served from memory in place of the download host.
 */
const fixture = (name: string) => readFileSync(path.join(__dirname, 'fixtures/officialBulk', name), 'utf8')
const held = (statuteData as unknown as { sections: Record<string, string> }).sections

describe('a section read from the bulk data', () => {
  const row = parseLawSectionRow(fixture('LAB_226.8.row'))!

  it('parses the row: code, section, statute, effective date, history, lob', () => {
    expect(row).toMatchObject({
      key: 'LAB 226.8',
      statuteYear: '2025',
      chapter: '67',
      effective: '2026-01-01',
      lob: 'LAW_SECTION_TBL_6064.lob',
      active: true,
    })
    expect(row.history).toMatch(/^Amended by Stats\. 2025, Ch\. 67, Sec\. 133\./)
  })

  it('is byte for byte the text pinned from the browser read on 2026-10-06', () => {
    // The same SHA-256 test/statutesPulled.test.ts pins for LAB 226.8: the
    // bulk route reproduces the browser extraction exactly, no-break spaces included.
    const text = filedText(lobToText(fixture('LAB_226.8.lob')), row.history)
    expect(sha256(text)).toBe('8d0479963d20c070947d4e12f123e71d628efd25a8460a1b7fa836c6bf503343')
    expect(text).toBe(held['LAB 226.8'])
  })

  it('renders the markup the browser rendered: EnSpace, fractions, entities, wrapped lines', () => {
    const xml =
      '<caml:Content><p>(a)<span class="EnSpace"/>Rate shall be<caml:Fraction><caml:Numerator>1</caml:Numerator>' +
      '<caml:Denominator>40</caml:Denominator></caml:Fraction>th of the\n\t\t\t\t  weekly salary &amp; more.</p><p> </p><p>(b)<span class="EnSpace"/>Next.</p></caml:Content>'
    expect(lobToText(xml)).toBe('(a) Rate shall be 1 / 40 th of the weekly salary & more.\n(b) Next.')
  })

  it('takes section keys the way they are typed, and refuses what is not one', () => {
    expect(normalizeSectionKey('CCP 1005')).toBe('CCP 1005')
    expect(normalizeSectionKey('ccp1010.6')).toBe('CCP 1010.6')
    expect(normalizeSectionKey('CCP-12a')).toBe('CCP 12a')
    expect(normalizeSectionKey('Code of Civil Procedure 1005')).toBeNull()
  })
})

describe('a chaptered bill that changes a section before the code shows it', () => {
  const codeNames = parseCodeNames(
    '`CCP`\t`Code of Civil Procedure - CCP`\n`GOV`\t`Government Code - GOV`\n`LAB`\t`Labor Code - LAB`\n`CONS`\t`* California Constitution - CONS`\n',
  )

  it('names the sections its text amends, adds or repeals', () => {
    const bill =
      '<p>SEC. 3.</p><p>Section 6700 of the Government Code is amended to read:</p><p>6700. (a) The holidays ...</p>' +
      '<p>SEC. 4.</p><p>Sections 1013 and 1010.6 of the Code of Civil Procedure are amended to read:</p>' +
      '<p>SEC. 5.</p><p>Section 98.1 of the Labor Code is repealed.</p>' +
      '<p>Existing law, Section 226.8 of the Labor Code, prohibits ...</p>'
    const changed = sectionsChangedByBill(bill, codeNames)
    expect([...changed.keys()]).toEqual(['GOV 6700', 'CCP 1013', 'CCP 1010.6', 'LAB 98.1'])
    expect(changed.get('LAB 98.1')).toBe('repealed')
    // Mentioned in the digest, not changed by the bill.
    expect(changed.has('LAB 226.8')).toBe(false)
  })

  it('reads the code names off CODES_TBL', () => {
    expect(codeNames.get('Government Code')).toBe('GOV')
    expect(codeNames.get('California Constitution')).toBe('CONS')
  })
})

describe('the archive read by range, not downloaded', () => {
  afterEach(() => vi.unstubAllGlobals())

  /** A two-entry zip, one stored and one deflated. */
  function buildZip(files: Record<string, { data: string; deflate: boolean }>): Buffer {
    const locals: Buffer[] = []
    const centrals: Buffer[] = []
    let offset = 0
    for (const [name, f] of Object.entries(files)) {
      const raw = Buffer.from(f.data)
      const body = f.deflate ? deflateRawSync(raw) : raw
      const nameBuf = Buffer.from(name)
      const local = Buffer.alloc(30)
      local.writeUInt32LE(0x04034b50, 0)
      local.writeUInt16LE(f.deflate ? 8 : 0, 8)
      local.writeUInt32LE(body.length, 18)
      local.writeUInt32LE(raw.length, 22)
      local.writeUInt16LE(nameBuf.length, 26)
      const central = Buffer.alloc(46)
      central.writeUInt32LE(0x02014b50, 0)
      central.writeUInt16LE(f.deflate ? 8 : 0, 10)
      central.writeUInt32LE(body.length, 20)
      central.writeUInt32LE(raw.length, 24)
      central.writeUInt16LE(nameBuf.length, 28)
      central.writeUInt32LE(offset, 42)
      locals.push(local, nameBuf, body)
      centrals.push(central, nameBuf)
      offset += 30 + nameBuf.length + body.length
    }
    const cd = Buffer.concat(centrals)
    const eocd = Buffer.alloc(22)
    eocd.writeUInt32LE(0x06054b50, 0)
    eocd.writeUInt16LE(Object.keys(files).length, 8)
    eocd.writeUInt16LE(Object.keys(files).length, 10)
    eocd.writeUInt32LE(cd.length, 12)
    eocd.writeUInt32LE(offset, 16)
    return Buffer.concat([...locals, cd, eocd])
  }

  it('opens the central directory and inflates only the entry asked for', async () => {
    const zip = buildZip({
      'CODES_TBL.dat': { data: '`CCP`\t`Code of Civil Procedure - CCP`\n', deflate: false },
      'LAW_SECTION_TBL_6064.lob': { data: fixture('LAB_226.8.lob'), deflate: true },
    })
    const ranges: string[] = []
    vi.stubGlobal('fetch', async (_url: string, init: { method?: string; headers: Record<string, string> }) => {
      expect(init.headers['User-Agent']).toMatch(/JackLaw-Portal/)
      if (init.method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'content-length': String(zip.length), 'last-modified': 'Mon, 23 Nov 2026 05:26:07 GMT' } })
      }
      const [, a, b] = init.headers.Range.match(/bytes=(\d+)-(\d+)/)!
      ranges.push(init.headers.Range)
      return new Response(new Uint8Array(zip.subarray(Number(a), Number(b) + 1)), { status: 206 })
    })

    const remote = await openRemoteZip('https://downloads.example/pubinfo.zip')
    expect([...remote.entries.keys()]).toEqual(['CODES_TBL.dat', 'LAW_SECTION_TBL_6064.lob'])
    expect(remote.lastModified).toBe('Mon, 23 Nov 2026 05:26:07 GMT')
    expect((await readZipEntry(remote, 'LAW_SECTION_TBL_6064.lob')).toString('utf8')).toBe(fixture('LAB_226.8.lob'))
    expect((await readZipEntry(remote, 'CODES_TBL.dat')).toString('utf8')).toMatch(/^`CCP`/)
    expect(ranges.length).toBe(4) // tail, central directory, then one read per entry
  })

  it('follows a ZIP64 record to a central directory past 4 GB of offsets', () => {
    const record = Buffer.alloc(56)
    record.writeUInt32LE(0x06064b50, 0)
    record.writeBigUInt64LE(BigInt(1234), 40)
    record.writeBigUInt64LE(BigInt(5_000_000_000), 48)
    const locator = Buffer.alloc(20)
    locator.writeUInt32LE(0x07064b50, 0)
    locator.writeBigUInt64LE(BigInt(9_000_000_000), 8)
    const eocd = Buffer.alloc(22)
    eocd.writeUInt32LE(0x06054b50, 0)
    eocd.writeUInt16LE(0xffff, 10)
    eocd.writeUInt32LE(0xffffffff, 12)
    eocd.writeUInt32LE(0xffffffff, 16)
    expect(findCentralDirectory(Buffer.concat([record, locator, eocd]), 9_000_000_000)).toEqual({ offset: 5_000_000_000, size: 1234 })
  })
})
