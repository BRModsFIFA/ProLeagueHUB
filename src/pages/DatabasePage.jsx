import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useOutletContext } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Database, Search, ChevronLeft, ChevronRight, Pencil, Trash2, Plus, Users, FileText, Upload, Download } from 'lucide-react';
import PlayerAvatar from '../components/ui/PlayerAvatar';
import TeamFormDialog from '../components/teams/TeamFormDialog';

const POSITIONS = ['GOL','ZAG','LE','LD','VOL','MC','ME','MD','MEI','PD','PE','SA','ATA'];
const PAGE_SIZE = 20;

const NATIONALITIES = [
  'Afeganistão','África do Sul','Albânia','Alemanha','Andorra','Angola','Argentina','Armênia','Austrália','Áustria',
  'Azerbaijão','Bélgica','Bolívia','Bósnia e Herzegovina','Brasil','Bulgária','Camarões','Canadá','Chile','China',
  'Colômbia','Coreia do Norte','Coreia do Sul','Costa do Marfim','Costa Rica','Croácia','Dinamarca','Egito',
  'El Salvador','Emirados Árabes Unidos','Equador','Eslováquia','Eslovênia','Espanha','Estados Unidos','Estônia',
  'Etiópia','Filipinas','Finlândia','França','Gana','Geórgia','Grécia','Guatemala','Guiné','Honduras','Hungria',
  'Índia','Indonésia','Irã','Iraque','Irlanda','Islândia','Israel','Itália','Jamaica','Japão','Jordânia',
  'Kosovo','Letônia','Líbano','Libéria','Lituânia','Luxemburgo','Macedônia do Norte','Marrocos','México',
  'Moldávia','Montenegro','Moçambique','Namíbia','Nigéria','Noruega','Nova Zelândia','Países Baixos','Panamá',
  'Paraguai','Peru','Polônia','Portugal','Quênia','Reino Unido','República Tcheca','Romênia','Rússia','Sérvia',
  'Suécia','Suíça','Tailândia','Tunísia','Turquia','Ucrânia','Uruguai','Venezuela','Vietnã','Zimbábue'
].sort();

const emptyPlayer = {
  nome: '', sobrenome: '', nome_comum: '', posicao: 'GOL', nacionalidade: 'Brasil',
  overall: 75, data_nascimento: '', salario_base: 0, valor_base: 0,
  multa_rescisoria: 0, foto_url: '', team_id: '', team_nome: '',
};

function getOvrColor(ovr) {
  if (ovr >= 80) return 'bg-green-800/80 text-green-200';
  if (ovr >= 70) return 'bg-green-600/60 text-green-100';
  if (ovr >= 50) return 'bg-yellow-600/60 text-yellow-100';
  return 'bg-red-700/60 text-red-100';
}

export default function DatabasePage() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [tab, setTab] = useState('jogadores');
  const [search, setSearch] = useState('');
  const [posFilter, setPosFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [playerModal, setPlayerModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(emptyPlayer);
  const [deletingAll, setDeletingAll] = useState(false);
  const [deleteByTeam, setDeleteByTeam] = useState('');
  const [deleteProgress, setDeleteProgress] = useState('');
  const [sortCol, setSortCol] = useState('nome');
  const [sortDir, setSortDir] = useState(1); // 1=asc, -1=desc

  const handleSortCol = (col) => {
    if (sortCol === col) setSortDir(d => -d);
    else { setSortCol(col); setSortDir(1); }
  };
  const SortIcon = ({ col }) => sortCol === col ? (sortDir === 1 ? ' ↑' : ' ↓') : '';

  const { data: players = [], isLoading } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.PlayersDatabase.list('nome', 2000),
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const createPlayer = useMutation({
    mutationFn: (data) => base44.entities.PlayersDatabase.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allPlayers'] }); setPlayerModal(false); },
  });

  const updatePlayer = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlayersDatabase.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['allPlayers'] }); setPlayerModal(false); setEditTarget(null); },
  });

  const deletePlayer = useMutation({
    mutationFn: (id) => base44.entities.PlayersDatabase.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['allPlayers'] }),
  });

  const formatMoney = (v) => {
    if (!v) return '€0';
    if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `€${(v / 1000).toFixed(0)}K`;
    return `€${v}`;
  };

  const parseBirthDate = (raw) => {
    if (!raw) return '';
    // DD/MM/AAAA → AAAA-MM-DD
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
      const [d, m, y] = raw.split('/');
      return `${y}-${m}-${d}`;
    }
    return raw; // already ISO or other format
  };

  const handleImportPlayers = async (text) => {
    if (!text?.trim()) return;
    setImporting(true);
    setImportStatus(null);
    const separator = text.includes(';') ? ';' : text.includes('\t') ? '\t' : ',';
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, '').replace(/\r/g, ''));

    let imported = 0, skipped = 0;
    const warnings = [];
    const validRows = [];

    for (const line of lines.slice(1)) {
      const values = line.split(separator).map(v => v.trim().replace(/"/g, '').replace(/\r/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });

      // Humanized column mapping
      const nome = obj.name || obj.nome || '';
      if (!nome) { skipped++; continue; }

      // Resolve team by name (case-insensitive, trim)
      const teamNameRaw = (obj.team_name || obj.team_nome || obj.team || obj.time || '').trim();
      const team = teamNameRaw
        ? teams.find(t => t.nome?.toLowerCase().trim() === teamNameRaw.toLowerCase())
        : null;
      if (teamNameRaw && !team) {
        warnings.push(`Time não encontrado: "${teamNameRaw}"`);
      }

      // Position: accept sigla directly (GOL, ATA, etc.)
      const posicaoRaw = (obj.position || obj.posicao || 'GOL').toUpperCase().trim();
      const posicao = POSITIONS.includes(posicaoRaw) ? posicaoRaw : 'GOL';

      // Nationality: accept name directly
      const nacionalidade = obj.nation || obj.nacionalidade || obj.nationality || 'Brasil';

      validRows.push({
        nome,
        sobrenome: obj.surname || obj.sobrenome || obj.lastname || '',
        nome_comum: obj.common_name || obj.nome_comum || '',
        overall: parseInt(obj.ovr || obj.overall || 0) || 0,
        nacionalidade,
        posicao,
        salario_base: parseFloat(obj.wage_eur || obj.salario_base || obj.salary || 0) || 0,
        valor_base: parseFloat(obj.value_eur || obj.valor_base || obj.value || 0) || 0,
        multa_rescisoria: parseFloat(obj.release_clause_eur || obj.multa_rescisoria || obj.release_clause || 0) || 0,
        data_nascimento: parseBirthDate(obj.nascimento || obj.data_nascimento || obj.birth_date || ''),
        foto_url: obj.player_face_url || obj.foto_url || obj.photo || '',
        team_id: team?.id || '',
        team_nome: team?.nome || '',
      });
    }

    for (let i = 0; i < validRows.length; i += 20) {
      await base44.entities.PlayersDatabase.bulkCreate(validRows.slice(i, i + 20));
      imported += Math.min(20, validRows.length - i);
    }

    queryClient.invalidateQueries({ queryKey: ['allPlayers'] });
    setImportStatus({ type: 'jogadores', imported, skipped, warnings });
    setImporting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImportTeams = async (text, teamsData) => {
    if (!text?.trim()) return;
    setImporting(true);
    setImportStatus(null);

    const { data: allLeagues = [] } = await base44.entities.League.list();
    const { data: allUsers = [] } = await base44.entities.User.list();

    const separator = text.includes(';') ? ';' : text.includes('\t') ? '\t' : ',';
    const lines = text.split('\n').filter(l => l.trim());
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase().replace(/"/g, '').replace(/\r/g, ''));
    let imported = 0;

    const rows = lines.slice(1).map(line => {
      const values = line.split(separator).map(v => v.trim().replace(/"/g, '').replace(/\r/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = values[i] || ''; });

      const ligaRef = obj.liga_id || obj.league_id || '';
      const league = allLeagues.find(l => l.league_id === ligaRef || l.id === ligaRef || l.nome?.toLowerCase() === ligaRef.toLowerCase());

      const donoEmail = obj.dono_email || obj.owner_email || '';
      const donoUser = allUsers.find(u => u.email === donoEmail);

      return {
        nome: obj.nome || '',
        escudo_url: obj.escudo_url || '',
        league_id: league?.id || '',
        orcamento: parseFloat(obj.orcamento || 0) || 0,
        reputation: parseInt(obj.reputacao || obj.reputation || 50) || 50,
        registration_fee_brl: parseFloat(obj.taxa_inscricao_brl || obj.registration_fee_brl || 0) || 0,
        owner_email: donoUser?.email || donoEmail || '',
        player_email: donoUser?.email || donoEmail || '',
        owner_name: donoUser?.full_name || '',
        owner_user_id: donoUser?.id || '',
      };
    }).filter(r => r.nome);

    for (let i = 0; i < rows.length; i += 10) {
      await base44.entities.Team.bulkCreate(rows.slice(i, i + 10));
      imported += Math.min(10, rows.length - i);
    }

    queryClient.invalidateQueries({ queryKey: ['teams'] });
    setImportStatus({ type: 'times', imported });
    setImporting(false);
  };

  const handleExportPlayers = () => {
    const headers = ['Name','Surname','Common_Name','Position','Nation','OVR','nascimento','wage_eur','value_eur','release_clause_eur','player_face_url','Team_Name'];
    const rows = players.map(p => {
      // Convert ISO date to DD/MM/AAAA
      let nascimento = p.data_nascimento || '';
      if (/^\d{4}-\d{2}-\d{2}/.test(nascimento)) {
        const [y, m, d] = nascimento.split('-');
        nascimento = `${d}/${m}/${y}`;
      }
      return [
        p.nome || '',
        p.sobrenome || '',
        p.nome_comum || '',
        p.posicao || '',
        p.nacionalidade || '',
        p.overall || 0,
        nascimento,
        p.salario_base || 0,
        p.valor_base || 0,
        p.multa_rescisoria || 0,
        p.foto_url || '',
        p.team_nome || '',
      ].join(';');
    });
    const csv = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'jogadores.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTeams = () => {
    const tms = teams;
    const headers = ['nome','league_id','escudo_url','orcamento','reputation','registration_fee_brl','owner_email'];
    const csv = [headers.join(';'), ...tms.map(t => headers.map(h => t[h] ?? '').join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'times.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteAll = async () => {
    if (!confirm('Excluir TODOS os jogadores? Esta ação é irreversível.')) return;
    setDeletingAll(true);
    let all = await base44.entities.PlayersDatabase.list('nome', 2000);
    let total = all.length;
    let deleted = 0;
    while (all.length > 0) {
      const batch = all.slice(0, 100);
      await Promise.all(batch.map(p => base44.entities.PlayersDatabase.delete(p.id)));
      deleted += batch.length;
      setDeleteProgress(`Excluídos ${deleted} de ${total}...`);
      all = await base44.entities.PlayersDatabase.list('nome', 2000);
      if (all.length === 0) break;
    }
    queryClient.invalidateQueries({ queryKey: ['allPlayers'] });
    setDeletingAll(false);
    setDeleteProgress('');
  };

  const handleDeleteByTeam = async () => {
    if (!deleteByTeam) return;
    const teamObj = teams.find(t => t.id === deleteByTeam);
    if (!confirm(`Excluir todos os jogadores de "${teamObj?.nome}"?`)) return;
    setDeletingAll(true);
    let teamPlayers = players.filter(p => p.team_id === deleteByTeam);
    let deleted = 0;
    const total = teamPlayers.length;
    while (teamPlayers.length > 0) {
      const batch = teamPlayers.slice(0, 100);
      await Promise.all(batch.map(p => base44.entities.PlayersDatabase.delete(p.id)));
      deleted += batch.length;
      setDeleteProgress(`Excluídos ${deleted} de ${total}...`);
      teamPlayers = teamPlayers.slice(100);
    }
    queryClient.invalidateQueries({ queryKey: ['allPlayers'] });
    setDeletingAll(false);
    setDeleteProgress('');
    setDeleteByTeam('');
  };

  const openCreate = () => { setEditTarget(null); setForm(emptyPlayer); setPlayerModal(true); };
  const openEdit = (p) => { setEditTarget(p); setForm({ ...p }); setPlayerModal(true); };
  const handleDeleteSingle = (id) => { if (confirm('Excluir jogador?')) deletePlayer.mutate(id); };

  const handleSave = () => {
    const teamObj = teams.find(t => t.id === form.team_id);
    const data = { ...form, team_nome: teamObj?.nome || form.team_nome || '' };
    if (editTarget) updatePlayer.mutate({ id: editTarget.id, data });
    else createPlayer.mutate(data);
  };

  const filtered = players.filter(p => {
    const matchesSearch = search === '' ||
      p.nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.nome_comum?.toLowerCase().includes(search.toLowerCase()) ||
      p.team_nome?.toLowerCase().includes(search.toLowerCase());
    const matchesPos = posFilter === 'all' || p.posicao === posFilter;
    const matchesTeam = teamFilter === 'all' || p.team_id === teamFilter;
    return matchesSearch && matchesPos && matchesTeam;
  }).sort((a, b) => {
    let av = a[sortCol] ?? '', bv = b[sortCol] ?? '';
    if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
    return (av - bv) * sortDir;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-4 lg:p-6 space-y-4 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Database</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{players.length} jogadores · {teams.length} times</p>
        </div>
      </div>

      {importStatus && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs space-y-1">
          <p className="font-semibold text-primary">Importação concluída</p>
          {importStatus.type === 'jogadores' && (
            <>
              <p>✅ Importados: {importStatus.imported} · Ignorados: {importStatus.skipped}</p>
              {importStatus.warnings?.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  <p className="text-yellow-400 font-semibold">⚠️ Avisos ({importStatus.warnings.length}):</p>
                  {importStatus.warnings.slice(0, 10).map((w, i) => <p key={i} className="text-yellow-300/80">• {w}</p>)}
                  {importStatus.warnings.length > 10 && <p className="text-muted-foreground">...e mais {importStatus.warnings.length - 10} aviso(s)</p>}
                </div>
              )}
            </>
          )}
          {importStatus.type === 'times' && <p>✅ Times importados: {importStatus.imported}</p>}
          <button className="text-muted-foreground underline" onClick={() => setImportStatus(null)}>Fechar</button>
        </div>
      )}

      {deleteProgress && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-xs text-destructive">
          {deleteProgress}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-secondary">
          <TabsTrigger value="jogadores">Jogadores</TabsTrigger>
          <TabsTrigger value="times">Times</TabsTrigger>
          <TabsTrigger value="importar">Importar/Exportar</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>

        <TabsContent value="jogadores" className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-40">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={`Buscar... (${filtered.length} jogadores)`}
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(0); }}
                  className="pl-9 bg-secondary border-0"
                />
              </div>
              <Select value={posFilter} onValueChange={v => { setPosFilter(v); setPage(0); }}>
                <SelectTrigger className="w-28 bg-secondary border-0"><SelectValue placeholder="Pos." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={teamFilter} onValueChange={v => { setTeamFilter(v); setPage(0); }}>
                <SelectTrigger className="w-44 bg-secondary border-0"><SelectValue placeholder="Filtrar por time..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os times</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 flex-wrap">
              {user?.role === 'admin' && (
                <>
                  <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo Jogador</Button>
                  <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleDeleteAll} disabled={deletingAll}>
                    {deletingAll ? 'Excluindo...' : 'Excluir Todos'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {user?.role === 'admin' && (
            <div className="flex gap-2 items-center">
              <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <Select value={deleteByTeam} onValueChange={setDeleteByTeam}>
                <SelectTrigger className="flex-1 max-w-xs bg-secondary border-0 text-xs"><SelectValue placeholder="Excluir jogadores por time..." /></SelectTrigger>
                <SelectContent>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              {deleteByTeam && (
                <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 text-xs" onClick={handleDeleteByTeam} disabled={deletingAll}>
                  Excluir do time
                </Button>
              )}
            </div>
          )}

          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-2.5 text-left cursor-pointer select-none hover:text-foreground" onClick={() => handleSortCol('nome')}>Jogador<SortIcon col="nome" /></th>
                  <th className="px-3 py-2.5 text-center cursor-pointer select-none hover:text-foreground" onClick={() => handleSortCol('posicao')}>POS<SortIcon col="posicao" /></th>
                  <th className="px-3 py-2.5 text-center cursor-pointer select-none hover:text-foreground" onClick={() => handleSortCol('overall')}>OVR<SortIcon col="overall" /></th>
                  <th className="px-3 py-2.5 text-left hidden md:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSortCol('nacionalidade')}>Nac.<SortIcon col="nacionalidade" /></th>
                  <th className="px-3 py-2.5 text-left hidden sm:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSortCol('team_nome')}>Time<SortIcon col="team_nome" /></th>
                  <th className="px-3 py-2.5 text-right hidden lg:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSortCol('salario_base')}>Salário<SortIcon col="salario_base" /></th>
                  <th className="px-3 py-2.5 text-right hidden lg:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSortCol('valor_base')}>Valor<SortIcon col="valor_base" /></th>
                  <th className="px-3 py-2.5 text-right hidden lg:table-cell cursor-pointer select-none hover:text-foreground" onClick={() => handleSortCol('multa_rescisoria')}>Multa<SortIcon col="multa_rescisoria" /></th>
                  {user?.role === 'admin' && <th className="px-3 py-2.5 text-center">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {paginated.map((p, idx) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <PlayerAvatar foto_url={p.foto_url} nome={p.nome} size="sm" />
                        <div>
                          <p className="font-semibold leading-tight">{p.nome_comum || p.nome}</p>
                          {p.nome_comum && <p className="text-[10px] text-muted-foreground leading-tight">{p.nome} {p.sobrenome}</p>}
                          <p className="text-[9px] text-muted-foreground/50">J{page * PAGE_SIZE + idx + 1}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className="text-[10px] font-mono">{p.posicao}</Badge>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${getOvrColor(p.overall || 0)}`}>
                        {p.overall || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{p.nacionalidade || '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{p.team_nome || <span className="italic">Sem time</span>}</td>
                    <td className="px-3 py-2 text-right hidden lg:table-cell">{formatMoney(p.salario_base)}</td>
                    <td className="px-3 py-2 text-right hidden lg:table-cell">{formatMoney(p.valor_base)}</td>
                    <td className="px-3 py-2 text-right hidden lg:table-cell">
                      {p.multa_rescisoria ? formatMoney(p.multa_rescisoria) : <span className="text-muted-foreground">—</span>}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(p)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeleteSingle(p.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {paginated.length === 0 && (
              <p className="text-center text-muted-foreground text-xs py-8">{isLoading ? 'Carregando...' : 'Nenhum jogador encontrado'}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Total: {players.length} jogadores · Filtrados: {filtered.length} · Página {page + 1} de {Math.max(1, totalPages)}
            </span>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="times" className="mt-4">
          <TeamsTab user={user} teams={teams} players={players} queryClient={queryClient} />
        </TabsContent>

        <TabsContent value="importar" className="mt-4">
          <ImportExportTab
            user={user}
            teams={teams}
            importing={importing}
            onImportPlayers={handleImportPlayers}
            onImportTeams={handleImportTeams}
            onExportPlayers={handleExportPlayers}
            onExportTeams={handleExportTeams}
          />
        </TabsContent>

        <TabsContent value="backup" className="mt-4">
          <BackupTab user={user} />
        </TabsContent>
      </Tabs>

      {/* Player Modal */}
      <Dialog open={playerModal} onOpenChange={setPlayerModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTarget ? 'Editar Jogador' : 'Novo Jogador'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div>
            <div><Label>Sobrenome</Label><Input value={form.sobrenome} onChange={e => setForm({...form, sobrenome: e.target.value})} /></div>
            <div className="col-span-2"><Label>Nome Comum</Label><Input value={form.nome_comum} onChange={e => setForm({...form, nome_comum: e.target.value})} placeholder="Nome exibido" /></div>
            <div>
              <Label>Posição</Label>
              <Select value={form.posicao} onValueChange={v => setForm({...form, posicao: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{POSITIONS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nacionalidade</Label>
              <Select value={form.nacionalidade} onValueChange={v => setForm({...form, nacionalidade: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-60">{NATIONALITIES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Overall</Label><Input type="number" min={0} max={99} value={form.overall} onChange={e => setForm({...form, overall: parseInt(e.target.value) || 0})} /></div>
            <div><Label>Data de Nasc.</Label><Input type="date" value={form.data_nascimento} onChange={e => setForm({...form, data_nascimento: e.target.value})} /></div>
            <div><Label>Salário Base (€)</Label><Input type="number" value={form.salario_base} onChange={e => setForm({...form, salario_base: parseFloat(e.target.value) || 0})} /></div>
            <div><Label>Valor de Mercado (€)</Label><Input type="number" value={form.valor_base} onChange={e => setForm({...form, valor_base: parseFloat(e.target.value) || 0})} /></div>
            <div className="col-span-2"><Label>Multa Rescisória (€)</Label><Input type="number" value={form.multa_rescisoria} onChange={e => setForm({...form, multa_rescisoria: parseFloat(e.target.value) || 0})} /></div>
            <div className="col-span-2"><Label>Foto URL</Label><Input value={form.foto_url} onChange={e => setForm({...form, foto_url: e.target.value})} placeholder="https://..." /></div>
            <div className="col-span-2">
              <Label>Vincular ao Time</Label>
              <Select value={form.team_id || 'none'} onValueChange={v => setForm({...form, team_id: v === 'none' ? '' : v})}>
                <SelectTrigger><SelectValue placeholder="Sem time" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem time</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSave} className="w-full mt-2">{editTarget ? 'Salvar' : 'Criar Jogador'}</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImportExportTab({ user, teams, importing, onImportPlayers, onImportTeams, onExportPlayers, onExportTeams }) {
  const [playerCsvText, setPlayerCsvText] = useState('');
  const [teamCsvText, setTeamCsvText] = useState('');
  const playerFileRef = useRef(null);
  const teamFileRef = useRef(null);

  const handlePlayerFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await onImportPlayers(text);
    e.target.value = '';
  };

  const handleTeamFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await onImportTeams(text, teams);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Importar Jogadores */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Upload className="w-4 h-4 text-primary" /> Importar Jogadores
        </h3>

        <div className="bg-secondary/40 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Formato CSV esperado (separado por ponto e vírgula)</p>
          <code className="text-[10px] text-muted-foreground block font-mono leading-relaxed break-all">
            Name;Surname;Common_Name;Position;Nation;OVR;nascimento;wage_eur;value_eur;release_clause_eur;player_face_url;Team_Name
          </code>
          <code className="text-[10px] text-primary block font-mono break-all">
            Erling;Braut Haaland;Haaland;ATA;Noruega;91;21/07/2000;390000;172500000;332100000;https://...;Manchester City
          </code>
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>• Separar colunas por <strong>ponto e vírgula (;)</strong></p>
            <p>• <strong>Team_Name</strong>: nome do time (ex: Manchester City). Se não encontrado, importado sem clube</p>
            <p>• <strong>Position</strong>: sigla da posição (GOL, ZAG, LD, LE, VOL, MC, MEI, ATA, SA, PD, PE)</p>
            <p>• <strong>Nation</strong>: nome da nacionalidade (ex: Brasil, Noruega, Egito)</p>
            <p>• <strong>nascimento</strong>: formato DD/MM/AAAA (ex: 21/07/2000)</p>
            <p>• Compatível com Excel, Google Sheets e LibreOffice</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Arquivo CSV</Label>
            <div className="flex gap-2 mt-1">
              <input ref={playerFileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handlePlayerFile} />
              <Button size="sm" variant="outline" onClick={() => playerFileRef.current?.click()} disabled={importing}>
                <Upload className="w-3 h-3 mr-1" /> Escolher Arquivo
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Ou cole o CSV aqui</Label>
            <textarea
              className="w-full mt-1 bg-secondary border border-border rounded-lg p-2 text-xs text-foreground font-mono h-24 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="Name;Surname;Common_Name;Position;Nation;OVR;nascimento;wage_eur;value_eur;release_clause_eur;player_face_url;Team_Name"
              value={playerCsvText}
              onChange={e => setPlayerCsvText(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={importing || !playerCsvText.trim()} onClick={() => { onImportPlayers(playerCsvText); setPlayerCsvText(''); }}>
              {importing ? 'Importando...' : 'Importar Jogadores'}
            </Button>
            <Button size="sm" variant="outline" onClick={onExportPlayers}>
              <Download className="w-3 h-3 mr-1" /> Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Importar Times */}
      {user?.role === 'admin' && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Upload className="w-4 h-4 text-accent" /> Importar Times
          </h3>

          <div className="bg-secondary/40 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Formato CSV esperado (separado por ponto e vírgula)</p>
            <code className="text-[10px] text-muted-foreground block font-mono leading-relaxed">
              nome;liga_id;escudo_url;orcamento;reputacao;taxa_inscricao_brl;dono_email
            </code>
            <code className="text-[10px] text-accent block font-mono">
              Arsenal;C1;https://...;153300000;93;48;player@email.com
            </code>
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <p>• Separar colunas por <strong>ponto e vírgula (;)</strong></p>
              <p>• O campo <strong>liga_id</strong> deve ser o ID da liga (ex: C1)</p>
              <p>• Se <strong>dono_email</strong> não existir, o time é importado sem dono</p>
              <p>• Folha salarial, valor e margem FPF são calculados automaticamente</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs">Arquivo CSV</Label>
              <div className="flex gap-2 mt-1">
                <input ref={teamFileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleTeamFile} />
                <Button size="sm" variant="outline" onClick={() => teamFileRef.current?.click()} disabled={importing}>
                  <Upload className="w-3 h-3 mr-1" /> Escolher Arquivo
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs">Ou cole o CSV aqui</Label>
              <textarea
                className="w-full mt-1 bg-secondary border border-border rounded-lg p-2 text-xs text-foreground font-mono h-24 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="nome;liga_id;escudo_url;..."
                value={teamCsvText}
                onChange={e => setTeamCsvText(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" disabled={importing || !teamCsvText.trim()} onClick={() => { onImportTeams(teamCsvText, teams); setTeamCsvText(''); }}>
                {importing ? 'Importando...' : 'Importar Times'}
              </Button>
              <Button size="sm" variant="outline" onClick={onExportTeams}>
                <Download className="w-3 h-3 mr-1" /> Exportar CSV
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function TeamsTab({ user, teams, players, queryClient }) {
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues'],
    queryFn: () => base44.entities.League.list(),
  });

  const saveTeam = useMutation({
    mutationFn: (data) => editTarget
      ? base44.entities.Team.update(editTarget.id, data)
      : base44.entities.Team.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['teams'] }); setDialogOpen(false); setEditTarget(null); },
  });

  const deleteTeam = useMutation({
    mutationFn: (id) => base44.entities.Team.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  const openCreate = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (t) => { setEditTarget(t); setDialogOpen(true); };
  const handleDelete = (id) => { if (confirm('Excluir este time?')) deleteTeam.mutate(id); };

  const filtered = teams.filter(t => !search || t.nome?.toLowerCase().includes(search.toLowerCase()));

  const formatMoney = (v) => {
    if (!v) return '€0';
    if (v >= 1000000) return `€${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `€${(v / 1000).toFixed(0)}K`;
    return `€${v}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar times..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-secondary border-0" />
        </div>
        {user?.role === 'admin' && (
          <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" /> Novo Time</Button>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="px-3 py-2.5 text-left">Time</th>
              <th className="px-3 py-2.5 text-left hidden sm:table-cell">Dono</th>
              <th className="px-3 py-2.5 text-center">Jogadores</th>
              <th className="px-3 py-2.5 text-right">Orçamento</th>
              <th className="px-3 py-2.5 text-right hidden sm:table-cell">Rep.</th>
              {user?.role === 'admin' && <th className="px-3 py-2.5 text-center">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => {
              const teamPlayers = players.filter(p => p.team_id === t.id);
              const league = leagues.find(l => l.id === t.league_id);
              return (
                <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <PlayerAvatar foto_url={t.escudo_url} nome={t.nome} size="sm" />
                      <div>
                        <span className="font-medium">{t.nome}</span>
                        {league && <p className="text-[10px] text-muted-foreground">{league.nome} {league.league_id ? `(${league.league_id})` : ''}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground hidden sm:table-cell">
                    {t.owner_name || t.player_email || '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center font-medium">{teamPlayers.length}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-accent">{formatMoney(t.orcamento)}</td>
                  <td className="px-3 py-2.5 text-right hidden sm:table-cell text-muted-foreground">{t.reputation ?? '—'}</td>
                  {user?.role === 'admin' && (
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(t)}><Pencil className="w-3 h-3" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="text-center text-muted-foreground text-xs py-8">Nenhum time encontrado</p>}
      </div>

      <TeamFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditTarget(null); }}
        editTarget={editTarget}
        onSave={(data) => saveTeam.mutate(data)}
        leagues={leagues}
      />
    </div>
  );
}

function BackupTab({ user }) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: snapshots = [] } = useQuery({
    queryKey: ['snapshots'],
    queryFn: () => base44.entities.DatabaseBackupSnapshot.list('-created_date', 20),
  });

  const createBackup = async () => {
    setCreating(true);
    const snap = await base44.entities.DatabaseBackupSnapshot.create({ nome: `Backup ${new Date().toLocaleDateString('pt-BR')}`, tipo: 'manual' });
    const players = await base44.entities.PlayersDatabase.list('nome', 2000);
    const teams = await base44.entities.Team.list();
    const playerBackups = players.map(p => ({ snapshot_id: snap.id, original_id: p.id, nome: p.nome, sobrenome: p.sobrenome, nome_comum: p.nome_comum, overall: p.overall, nacionalidade: p.nacionalidade, posicao: p.posicao, salario_base: p.salario_base, valor_base: p.valor_base, multa_rescisoria: p.multa_rescisoria, foto_url: p.foto_url, team_id: p.team_id, team_nome: p.team_nome }));
    const teamBackups = teams.map(t => ({ snapshot_id: snap.id, original_id: t.id, nome: t.nome, escudo_url: t.escudo_url, league_id: t.league_id, player_email: t.player_email, orcamento: t.orcamento, folha_salarial: t.folha_salarial, valor_clube: t.valor_clube }));
    for (let i = 0; i < playerBackups.length; i += 20) await base44.entities.PlayersBackup.bulkCreate(playerBackups.slice(i, i + 20));
    for (let i = 0; i < teamBackups.length; i += 20) await base44.entities.TeamsBackup.bulkCreate(teamBackups.slice(i, i + 20));
    await base44.entities.DatabaseBackupSnapshot.update(snap.id, { total_jogadores: players.length, total_times: teams.length });
    queryClient.invalidateQueries({ queryKey: ['snapshots'] });
    setCreating(false);
  };

  return (
    <div className="space-y-4">
      {user?.role === 'admin' && (
        <Button onClick={createBackup} disabled={creating}>
          {creating ? 'Criando backup...' : 'Criar Backup Manual'}
        </Button>
      )}
      <div className="space-y-2">
        {snapshots.map(s => (
          <div key={s.id} className="bg-card rounded-lg border border-border p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{s.nome}</p>
              <p className="text-xs text-muted-foreground">{s.total_jogadores || 0} jogadores · {s.total_times || 0} times</p>
              <p className="text-[10px] text-muted-foreground">{new Date(s.created_date).toLocaleString('pt-BR')}</p>
            </div>
            <Badge variant="outline" className="text-[10px]">{s.tipo}</Badge>
          </div>
        ))}
        {snapshots.length === 0 && <p className="text-center text-muted-foreground text-xs py-8">Nenhum backup encontrado</p>}
      </div>
    </div>
  );
}