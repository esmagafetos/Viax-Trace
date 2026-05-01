import xlsx from 'xlsx';
import {
  processarEndereco,
  type AddressRow,
  type ResultRow,
} from './lib/geocoder.ts';

const ARQUIVOS = [
  { path: '/home/runner/workspace/attached_assets/27-03-2026_IVONI_CONCEICAO_CAMPOS_SANTOS_1777591069786.xlsx', label: '36 linhas — IVONI Mar/26' },
];

function lerXLSX(path: string): AddressRow[] {
  const wb = xlsx.readFile(path);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const norm = (s: string) => s.trim().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim();
  const header = rows[0].map((c: any) => norm(String(c)));
  const col = (...aliases: string[]) => {
    for (const a of aliases.map(norm)) { const i = header.indexOf(a); if (i!==-1) return i; }
    return -1;
  };
  const cEnd = col('destination address','endereco destino','endereco','address');
  const cLat = col('latitude','lat');
  const cLon = col('longitude','lon','lng');
  const cCid = col('city','cidade','municipio');
  const cBai = col('neighborhood','bairro');
  const cCep = col('zipcodepostal code','zipcode postal code','zip','cep');
  const out: AddressRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const end = String(r[cEnd]??'').trim();
    if (!end) continue;
    out.push({
      linha: i+1, endereco: end,
      lat: cLat!==-1 && r[cLat]!=='' ? Number(r[cLat]) : null,
      lon: cLon!==-1 && r[cLon]!=='' ? Number(r[cLon]) : null,
      cidade: cCid!==-1 ? String(r[cCid]??'').trim() : '',
      bairro: cBai!==-1 ? String(r[cBai]??'').trim() : '',
      cep:    cCep!==-1 ? String(r[cCep]??'').trim() : '',
    });
  }
  return out;
}

const T = (s: string|null|undefined, n: number) =>
  !s ? '—' : s.length>n ? s.slice(0,n-1)+'…' : s;
const pad = (s: string, n: number) => s.slice(0,n).padEnd(n);

async function processar(filePath: string, label: string) {
  const rows = lerXLSX(filePath);
  console.log(`\n${'═'.repeat(140)}`);
  console.log(`📋 PLANILHA: ${label}  (${rows.length} endereços)`);
  console.log('═'.repeat(140));

  const cache = new Map<string, { data: any; ts: number }>();
  let ultimaReq = 0;
  const resultados: (ResultRow & { bairro?: string })[] = [];

  for (const item of rows) {
    process.stdout.write(`[${String(item.linha).padStart(3)}] ${T(item.endereco,58).padEnd(60)}`);
    const t0 = Date.now();
    try {
      const { resultado, ultimaReq: uR } = await processarEndereco(
        item, 'builtin', null, ultimaReq, cache, 300, 'builtin', null, null, null
      );
      ultimaReq = uR;
      (resultado as any).bairro = item.bairro;
      resultados.push(resultado as any);
      console.log(` ${resultado.is_nuance ? '🔴 NUANCE' : '✅ OK    '} ${Date.now()-t0}ms`);
    } catch (e: any) {
      console.log(` ❌ ERRO: ${e.message.slice(0,60)}`);
      resultados.push({
        linha: item.linha, endereco_original: item.endereco,
        nome_rua_extraido: null, nome_rua_oficial: null,
        similaridade: null, is_nuance: true,
        motivo: `Erro: ${e.message}`, poi_estruturado: null,
        distancia_metros: null, tipo_endereco: 'erro',
        bairro: item.bairro,
      });
    }
  }

  console.log(`\n${'─'.repeat(140)}`);
  console.log(
    pad('Ln',4) + pad('?',10) + pad('Tipo',14) +
    pad('Rua Extraída',26) + pad('Rua Oficial (Geocoder)',30) +
    pad('Sim%',6) + pad('GPS↔m',8) + 'Motivo / Bairro'
  );
  console.log('─'.repeat(140));

  let ok=0, nuance=0;
  for (const r of resultados) {
    if (r.is_nuance) nuance++; else ok++;
    const sim = r.similaridade!=null ? `${Math.round(r.similaridade*100)}%` : '—';
    const dist = r.distancia_metros!=null ? `${r.distancia_metros}m` : '—';
    const motivo = r.motivo
      ? T(r.motivo,55)
      : (r as any).bairro ? `[${T((r as any).bairro,40)}]` : '';
    console.log(
      pad(String(r.linha),4) +
      pad(r.is_nuance ? '🔴 SIM' : '✅ NÃO', 10) +
      pad(r.tipo_endereco??'',14) +
      pad(r.nome_rua_extraido??'—',26) +
      pad(r.nome_rua_oficial??'—',30) +
      pad(sim,6) + pad(dist,8) + motivo
    );
  }

  console.log('─'.repeat(140));
  console.log(`\n📊 RESUMO: ${ok} aprovados ✅  +  ${nuance} nuances 🔴  de ${resultados.length} endereços`);
  console.log(`📈 Taxa de aprovação: ${Math.round(ok/resultados.length*100)}%\n`);
}

(async () => {
  for (const f of ARQUIVOS) {
    await processar(f.path, f.label);
  }
})();
