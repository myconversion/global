import { useState, useMemo, useEffect } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserCog, Plus, Search, Users, DollarSign, Calendar, Briefcase, BarChart3, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { KPICard } from '@/components/shared/KPICard';
import { TableSkeleton } from '@/components/shared/TableSkeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { TablePagination } from '@/components/shared/TablePagination';
import { usePagination } from '@/hooks/usePagination';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { withBuFilter } from '@/lib/bu-filter';
import { useI18n } from '@/contexts/I18nContext';
import { getDateLocale } from '@/i18n/date-locale';
import type { Tables } from '@/integrations/supabase/types';
import { formatCurrency } from '@/lib/format-utils';

type Employee = Tables<'employees'>;

const CONTRACT_COLOR: Record<string, string> = { clt: 'default', pj: 'secondary', intern: 'outline', freelancer: 'secondary' };

export default function HRPage() {
  const { toast } = useToast();
  const { t, language } = useI18n();
  const { currentCompany, supabaseUser, currentBusinessUnit } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [empDialog, setEmpDialog] = useState(false);
  const [empForm, setEmpForm] = useState({ name: '', role: '', department: '', email: '', phone: '', salary: '', employment_type: 'clt' });

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: '', department: '', email: '', phone: '', salary: '', employment_type: 'clt', is_active: true });
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [savingEmp, setSavingEmp] = useState(false);
  const [editingEmp, setEditingEmp] = useState(false);
  const [deletingEmp, setDeletingEmp] = useState(false);

  const EMPLOYMENT_LABEL: Record<string, string> = { clt: t.hr.clt, pj: t.hr.pj, intern: t.hr.intern, freelancer: t.hr.freelancer };

  const fmt = (v: number) => formatCurrency(v, language);

  const companyId = currentCompany?.id;
  const buId = currentBusinessUnit?.id;

  useEffect(() => {
    if (!companyId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await withBuFilter(supabase.from('employees').select('*').eq('company_id', companyId).order('name'), buId);
      setEmployees(data || []);
      setLoading(false);
    };
    fetch();
  }, [companyId, buId]);

  const departments = useMemo(() => [...new Set(employees.map(e => e.department).filter(Boolean))], [employees]);

  const filteredEmployees = useMemo(() => employees.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.role.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'all' || e.department === deptFilter;
    return matchSearch && matchDept;
  }), [employees, search, deptFilter]);

  const { paginatedItems: paginatedEmployees, ...hrPagination } = usePagination(filteredEmployees);

  const activeEmployees = useMemo(() => employees.filter(e => e.is_active), [employees]);

  const kpis = useMemo(() => {
    const totalPayroll = activeEmployees.reduce((s, e) => s + Number(e.salary || 0), 0);
    const clt = activeEmployees.filter(e => e.employment_type === 'clt').length;
    const pj = activeEmployees.filter(e => e.employment_type === 'pj').length;
    return { active: activeEmployees.length, total: employees.length, totalPayroll, clt, pj };
  }, [employees, activeEmployees]);

  const handleAddEmployee = async () => {
    if (!empForm.name || !empForm.role || !companyId) return;
    setSavingEmp(true);
    const { data, error } = await supabase.from('employees').insert({
      company_id: companyId,
      business_unit_id: buId ?? null,
      name: empForm.name,
      role: empForm.role,
      department: empForm.department || null,
      email: empForm.email,
      phone: empForm.phone || null,
      salary: parseFloat(empForm.salary) || null,
      employment_type: empForm.employment_type as any,
      created_by: supabaseUser?.id || null,
    } as any).select().single();
    setSavingEmp(false);
    if (error) { toast({ title: t.common.error, description: error.message, variant: 'destructive' }); return; }
    setEmployees(prev => [...prev, data]);
    setEmpForm({ name: '', role: '', department: '', email: '', phone: '', salary: '', employment_type: 'clt' });
    setEmpDialog(false);
    toast({ title: t.hr.employeeAdded });
  };

  const openEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setEditForm({
      name: emp.name, role: emp.role, department: emp.department || '',
      email: emp.email, phone: emp.phone || '', salary: emp.salary ? String(emp.salary) : '',
      employment_type: emp.employment_type, is_active: emp.is_active,
    });
  };

  const handleEdit = async () => {
    if (!editingEmployee) return;
    const { error } = await supabase.from('employees').update({
      name: editForm.name, role: editForm.role, department: editForm.department || null,
      email: editForm.email, phone: editForm.phone || null, salary: parseFloat(editForm.salary) || null,
      employment_type: editForm.employment_type as any, is_active: editForm.is_active,
    }).eq('id', editingEmployee.id);
    if (error) { toast({ title: t.common.error, description: error.message, variant: 'destructive' }); return; }
    setEmployees(prev => prev.map(e => e.id === editingEmployee.id ? {
      ...e, name: editForm.name, role: editForm.role, department: editForm.department || null,
      email: editForm.email, phone: editForm.phone || null, salary: parseFloat(editForm.salary) || null,
      employment_type: editForm.employment_type as any, is_active: editForm.is_active,
    } : e));
    setEditingEmployee(null);
    toast({ title: t.hr.employeeUpdated });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('employees').delete().eq('id', deleteTarget.id);
    if (error) { toast({ title: t.common.error, description: error.message, variant: 'destructive' }); return; }
    setEmployees(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast({ title: t.hr.employeeDeleted });
  };

  const deptSalaryData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    activeEmployees.forEach(e => {
      const dept = e.department || t.hr.noDepartment;
      const prev = map.get(dept) || { total: 0, count: 0 };
      map.set(dept, { total: prev.total + Number(e.salary || 0), count: prev.count + 1 });
    });
    return Array.from(map.entries()).map(([name, { total, count }]) => ({ name, total, avg: Math.round(total / count) })).sort((a, b) => b.total - a.total);
  }, [activeEmployees, t]);

  const contractData = useMemo(() => {
    const map = new Map<string, number>();
    activeEmployees.forEach(e => {
      const label = EMPLOYMENT_LABEL[e.employment_type] || e.employment_type;
      map.set(label, (map.get(label) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [activeEmployees, EMPLOYMENT_LABEL]);

  const headcountData = useMemo(() => {
    const map = new Map<string, number>();
    activeEmployees.forEach(e => {
      const dept = e.department || t.hr.noDepartment;
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [activeEmployees, t]);

  const CHART_COLORS = ['hsl(217, 91%, 60%)', 'hsl(187, 92%, 55%)', 'hsl(45, 93%, 58%)', 'hsl(24, 95%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(0, 84%, 60%)'];

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.hr.title} description={t.hr.description} icon={<UserCog className="w-5 h-5 text-primary" />} />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICard key={i} label="" value="" loading />)}
        </div>
        <TableSkeleton columns={7} rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t.hr.title} description={t.hr.description} icon={<UserCog className="w-5 h-5 text-primary" />} />

      <div className="grid gap-4 md:grid-cols-4">
        <KPICard label={t.hr.activeEmployees} tooltip={t.hr.activeEmployeesTooltip} value={`${kpis.active}/${kpis.total}`} icon={<Users className="w-4 h-4" />} color="text-primary" />
        <KPICard label={t.hr.monthlyPayroll} tooltip={t.hr.monthlyPayrollTooltip} value={fmt(kpis.totalPayroll)} icon={<DollarSign className="w-4 h-4" />} color="text-warning" />
        <KPICard label={t.hr.cltPj} tooltip={t.hr.cltPjTooltip} value={`${kpis.clt} ${t.hr.clt} · ${kpis.pj} ${t.hr.pj}`} icon={<Briefcase className="w-4 h-4" />} color="text-muted-foreground" />
        <KPICard label={t.hr.departments} tooltip={t.hr.departmentsTooltip} value={String(departments.length)} icon={<Calendar className="w-4 h-4" />} color="text-success" />
      </div>

      <Tabs defaultValue="team">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="team" className="gap-1.5"><Users className="w-4 h-4" /> {t.hr.team}</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="w-4 h-4" /> {t.hr.analytics}</TabsTrigger>
          </TabsList>
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 w-[240px]" placeholder={t.hr.searchEmployee} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder={t.hr.department} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.hr.allDepartments}</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d!}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={empDialog} onOpenChange={setEmpDialog}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="w-4 h-4" /> {t.hr.newEmployee}</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{t.hr.newEmployee}</DialogTitle><DialogDescription>{t.hr.addFirstEmployee}</DialogDescription></DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t.hr.fullName}</Label><Input value={empForm.name} onChange={e => setEmpForm(f => ({ ...f, name: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t.hr.position}</Label><Input value={empForm.role} onChange={e => setEmpForm(f => ({ ...f, role: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t.hr.department}</Label><Input value={empForm.department} onChange={e => setEmpForm(f => ({ ...f, department: e.target.value }))} /></div>
                    <div className="space-y-2">
                      <Label>{t.hr.contractType}</Label>
                      <Select value={empForm.employment_type} onValueChange={v => setEmpForm(f => ({ ...f, employment_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clt">{t.hr.clt}</SelectItem>
                          <SelectItem value="pj">{t.hr.pj}</SelectItem>
                          <SelectItem value="intern">{t.hr.intern}</SelectItem>
                          <SelectItem value="freelancer">{t.hr.freelancer}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>{t.common.email}</Label><Input value={empForm.email} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))} /></div>
                    <div className="space-y-2"><Label>{t.common.phone}</Label><Input value={empForm.phone} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  </div>
                  <div className="space-y-2"><Label>{t.hr.salary}</Label><Input type="number" value={empForm.salary} onChange={e => setEmpForm(f => ({ ...f, salary: e.target.value }))} /></div>
                </div>
                <DialogFooter><Button onClick={handleAddEmployee} loading={savingEmp} disabled={!empForm.name || !empForm.role || !empForm.email}>{t.common.save}</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.hr.employee}</TableHead>
                  <TableHead>{t.hr.department}</TableHead>
                  <TableHead>{t.hr.contract}</TableHead>
                  <TableHead className="text-right">{t.hr.salary}</TableHead>
                  <TableHead>{t.hr.hireDate}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedEmployees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold">{emp.name}</p>
                          <p className="text-xs text-muted-foreground">{emp.role}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{emp.department || '—'}</TableCell>
                    <TableCell><Badge variant={CONTRACT_COLOR[emp.employment_type] as any} className="text-xs">{EMPLOYMENT_LABEL[emp.employment_type]}</Badge></TableCell>
                    <TableCell className="text-right text-sm font-semibold">{emp.salary ? fmt(Number(emp.salary)) : '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(emp.hire_date).toLocaleDateString(language === 'pt-BR' ? 'pt-BR' : language === 'es' ? 'es' : 'en-US')}</TableCell>
                    <TableCell><Badge variant="secondary" className={`text-xs ${emp.is_active ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>{emp.is_active ? t.common.active : t.common.inactive}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(emp)}><Pencil className="w-4 h-4 mr-2" /> {t.common.edit}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteTarget(emp)} className="text-destructive focus:text-destructive"><Trash2 className="w-4 h-4 mr-2" /> {t.common.delete}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEmployees.length === 0 && employees.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="p-0">
                    <EmptyState title={t.hr.noEmployees} description={t.hr.addFirstEmployee} actionLabel={t.hr.newEmployee} onAction={() => setEmpDialog(true)} />
                  </TableCell></TableRow>
                )}
                {filteredEmployees.length === 0 && employees.length > 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t.hr.noFilterResults}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination {...hrPagination} />
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card><CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t.hr.grossPayroll}</p>
              <p className="text-lg font-bold">{fmt(activeEmployees.reduce((s, e) => s + Number(e.salary || 0), 0))}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t.hr.avgSalary}</p>
              <p className="text-lg font-bold">{fmt(activeEmployees.length > 0 ? activeEmployees.reduce((s, e) => s + Number(e.salary || 0), 0) / activeEmployees.length : 0)}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t.hr.departments}</p>
              <p className="text-lg font-bold">{deptSalaryData.length}</p>
            </CardContent></Card>
            <Card><CardContent className="p-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t.hr.biggestPayrollDept}</p>
              <p className="text-lg font-bold text-primary">{deptSalaryData[0]?.name || '—'}</p>
            </CardContent></Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.hr.salaryByDept}</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptSalaryData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <XAxis type="number" fontSize={12} tickFormatter={v => fmt(v)} />
                    <YAxis type="category" dataKey="name" width={80} fontSize={11} />
                    <Tooltip formatter={(val: number, name: string) => [fmt(val), name === 'total' ? t.hr.total : t.hr.average]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="total" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} name={t.hr.total} />
                    <Bar dataKey="avg" fill="hsl(187, 92%, 55%)" radius={[0, 4, 4, 0]} name={t.hr.average} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.hr.employeesByDept}</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={headcountData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                      {headcountData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend fontSize={12} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">{t.hr.contractDistribution}</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={contractData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} fontSize={11}>
                      {contractData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend fontSize={12} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Employee Dialog */}
      <Dialog open={!!editingEmployee} onOpenChange={() => setEditingEmployee(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t.hr.editEmployee}</DialogTitle><DialogDescription>{t.hr.editEmployeeDesc}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t.hr.fullName}</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t.hr.position}</Label><Input value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t.hr.department}</Label><Input value={editForm.department} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>{t.hr.contractType}</Label>
                <Select value={editForm.employment_type} onValueChange={v => setEditForm(f => ({ ...f, employment_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clt">{t.hr.clt}</SelectItem>
                    <SelectItem value="pj">{t.hr.pj}</SelectItem>
                    <SelectItem value="intern">{t.hr.intern}</SelectItem>
                    <SelectItem value="freelancer">{t.hr.freelancer}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t.common.email}</Label><Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{t.common.phone}</Label><Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t.hr.salary}</Label><Input type="number" value={editForm.salary} onChange={e => setEditForm(f => ({ ...f, salary: e.target.value }))} /></div>
              <div className="space-y-2">
                <Label>{t.common.status}</Label>
                <Select value={editForm.is_active ? 'active' : 'inactive'} onValueChange={v => setEditForm(f => ({ ...f, is_active: v === 'active' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t.common.active}</SelectItem>
                    <SelectItem value="inactive">{t.common.inactive}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter><Button onClick={handleEdit} disabled={!editForm.name || !editForm.role}>{t.common.save}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.hr.deleteEmployee}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> {t.hr.deleteEmployeeDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.common.delete}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
