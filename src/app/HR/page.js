"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  DollarSign,
  Landmark,
  ListChecks,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Settings,
  Trash2,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import API from "../utils/api";

const DAY_OPTIONS = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

const HR_MAIN_TABS = [
  { id: "overview", label: "Overview", icon: ListChecks },
  { id: "staff-payroll", label: "Staff & Payroll", icon: Users },
  { id: "banks-loans", label: "Banks & Loans", icon: Landmark },
];

const PAYROLL_CYCLE_OPTIONS = [1, 7, 15];
const WORK_DAYS_PER_MONTH = 26;
const PAYROLL_SCOPE_OPTIONS = [
  { id: "daily", label: "Daily" },
  { id: "hourly", label: "Hourly" },
  ...PAYROLL_CYCLE_OPTIONS.map((day) => ({ id: `monthly:${day}`, label: `${day} to ${day}` })),
];
const ATTENDANCE_STATUS_META = {
  present: { label: "Present", short: "P", tone: "green" },
  absent: { label: "Absent", short: "A", tone: "rose" },
  half_day: { label: "Half Day", short: "HD", tone: "amber" },
  paid_leave: { label: "Paid Leave", short: "PL", tone: "blue" },
  short_leave: { label: "Short Leave", short: "SL", tone: "violet" },
};
const ATTENDANCE_MARK_OPTIONS = [
  ["present", "P"],
  ["absent", "A"],
];

const emptyDepartment = {
  name: "",
  description: "",
  weeklyOffDays: [0],
  shift: { name: "General", start: "09:00", end: "18:00", breakMinutes: 60 },
  leavePolicy: { paidLeaves: 0, shortLeaves: 0 },
};

const emptyStaff = {
  employeeCode: "",
  name: "",
  email: "",
  phone: "",
  department: "",
  designation: "",
  monthlySalary: "",
  salaryBasis: "monthly",
  expectedHoursPerDay: 8,
  payrollCycleDay: 1,
  joinDate: localDate(),
  status: "active",
};

const emptyBank = {
  name: "",
  accountName: "",
  accountNumber: "",
  balance: "",
};

const emptyBankTopUp = {
  amount: "",
  note: "",
};

const emptyBankPayment = {
  bankId: "",
  direction: "out",
  partyType: "employee",
  purpose: "salary",
  staff: "",
  loan: "",
  payroll: "",
  beneficiaryName: "",
  beneficiaryAccount: "",
  amount: "",
  emi: "",
  issueDate: localDate(),
  note: "",
};

const emptyLoan = {
  staff: "",
  amount: "",
  emi: "",
  issueDate: localDate(),
  note: "",
};

function localDate(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

function timeToMinutes(time) {
  if (!time || typeof time !== "string") return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (![hours, minutes].every(Number.isFinite)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function calculateWorkHours(checkIn, checkOut) {
  const start = timeToMinutes(checkIn);
  const end = timeToMinutes(checkOut);
  if (start === null || end === null) return 0;
  const adjustedEnd = end < start ? end + 24 * 60 : end;
  return Math.round(((adjustedEnd - start) / 60) * 100) / 100;
}

function addHoursToTime(startTime, hours) {
  const start = timeToMinutes(startTime);
  const numericHours = Number(hours);
  if (start === null || !Number.isFinite(numericHours)) return "";
  const totalMinutes = Math.round(start + Math.max(0, numericHours) * 60);
  const wrapped = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const nextHours = Math.floor(wrapped / 60);
  const nextMinutes = wrapped % 60;
  return `${String(nextHours).padStart(2, "0")}:${String(nextMinutes).padStart(2, "0")}`;
}

function shiftLabel(shift) {
  if (!shift?.start && !shift?.end) return "No shift set";
  return `${shift?.start || "--"} - ${shift?.end || "--"}`;
}

function payrollDueDateFromValue(day, value = localDate()) {
  const safeDay = PAYROLL_CYCLE_OPTIONS.includes(Number(day)) ? Number(day) : 1;
  return `${(value || localDate()).slice(0, 7)}-${String(safeDay).padStart(2, "0")}`;
}

function normalizePayrollCycleDay(day, fallback = 1) {
  const parsed = Number(day);
  return PAYROLL_CYCLE_OPTIONS.includes(parsed) ? parsed : fallback;
}

function normalizeSalaryBasisValue(basis) {
  if (basis === "weekly") return "daily";
  return ["monthly", "daily", "hourly"].includes(basis) ? basis : "monthly";
}

function payrollCycleDayFromDate(value, fallback = 1) {
  const day = Number((value || "").slice(8, 10));
  return normalizePayrollCycleDay(day, fallback);
}

function staffPayrollCycleDay(staff) {
  return normalizePayrollCycleDay(staff?.payrollCycleDay, 1);
}

function payrollScopeBasis(scope) {
  if (scope === "weekly") return "daily";
  if (scope === "daily") return "daily";
  if (scope === "hourly") return "hourly";
  return "monthly";
}

function payrollScopeCycleDay(scope, fallback = 1) {
  if (!scope?.startsWith("monthly:")) return normalizePayrollCycleDay(fallback, 1);
  return normalizePayrollCycleDay(scope.split(":")[1], fallback);
}

function payrollScopeMatchesStaff(staff, scope) {
  return normalizeSalaryBasisValue(staff?.salaryBasis) === payrollScopeBasis(scope);
}

function payrollMatchesScope(payroll, scope) {
  const basis = normalizeSalaryBasisValue(payroll?.salaryBasis || payroll?.staff?.salaryBasis);
  if (basis !== payrollScopeBasis(scope)) return false;
  if (basis !== "monthly") return true;
  return Number(payroll?.cycleStartDay || staffPayrollCycleDay(payroll?.staff)) === payrollScopeCycleDay(scope);
}

function parseDateValue(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addCalendarDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function movePayrollDate(value, scope, direction) {
  const safeDate = parseDateValue(value || localDate());
  const basis = payrollScopeBasis(scope);
  if (basis === "daily" || basis === "hourly") return localDate(addCalendarDays(safeDate, direction));
  const cycleDay = payrollScopeCycleDay(scope);
  const next = new Date(safeDate);
  next.setMonth(next.getMonth() + direction);
  return payrollDueDateFromValue(cycleDay, localDate(next));
}

function normalizePayrollDateForScope(value, scope) {
  const safeDate = value || localDate();
  if (payrollScopeBasis(scope) !== "monthly") return safeDate;
  return payrollDueDateFromValue(payrollScopeCycleDay(scope), safeDate);
}

function payrollCycleCaption(scope, dueDate) {
  const basis = payrollScopeBasis(scope);
  const end = parseDateValue(dueDate || localDate());
  if (basis === "daily" || basis === "hourly") {
    return end.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }
  const period = buildPayrollPeriod(dueDate, payrollScopeCycleDay(scope));
  const start = parseDateValue(period.periodStart);
  const last = addCalendarDays(parseDateValue(period.periodEnd), -1);
  return `${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} to ${last.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

function payrollScopeLabel(scope) {
  return PAYROLL_SCOPE_OPTIONS.find((option) => option.id === scope)?.label || "Payroll";
}

function payrollScopeForStaff(staff) {
  const basis = normalizeSalaryBasisValue(staff?.salaryBasis);
  if (basis === "daily" || basis === "hourly") return basis;
  return `monthly:${staffPayrollCycleDay(staff)}`;
}

function usesSingleDayAttendance(staff) {
  const basis = normalizeSalaryBasisValue(staff?.salaryBasis);
  return basis === "daily" || basis === "hourly";
}

function payrollDueDateForStaff(staff, referenceDate = localDate()) {
  const basis = normalizeSalaryBasisValue(staff?.salaryBasis);
  const safeDate = referenceDate || localDate();
  if (basis === "daily" || basis === "hourly") return safeDate;
  const cycleDay = staffPayrollCycleDay(staff);
  const ref = parseDateValue(safeDate);
  const due = new Date(ref.getFullYear(), ref.getMonth(), cycleDay);
  if (localDate(due) > safeDate) due.setMonth(due.getMonth() - 1);
  return localDate(due);
}

function buildPayrollPeriod(dueDate, cycleDay) {
  const safeDueDate = payrollDueDateFromValue(cycleDay, dueDate || localDate());
  const periodEndDate = parseDateValue(safeDueDate);
  const periodStartDate = new Date(periodEndDate);
  periodStartDate.setMonth(periodStartDate.getMonth() - 1);
  const dates = [];
  for (let cursor = new Date(periodStartDate); cursor < periodEndDate; cursor = addCalendarDays(cursor, 1)) {
    dates.push(localDate(cursor));
  }
  return {
    periodStart: localDate(periodStartDate),
    periodEnd: localDate(periodEndDate),
    dates,
  };
}

function isPayrollDueOnDate(staff, dueDate) {
  const basis = normalizeSalaryBasisValue(staff?.salaryBasis);
  const joinDate = staff?.joinDate ? staff.joinDate.slice(0, 10) : "";
  if (joinDate && dueDate < joinDate) return false;
  if (basis === "daily" || basis === "hourly") return true;
  return PAYROLL_CYCLE_OPTIONS.includes(Number(dueDate.slice(8, 10))) && staffPayrollCycleDay(staff) === Number(dueDate.slice(8, 10));
}

function buildPayrollPeriodForStaff(staff, dueDate, cycleDay) {
  const basis = normalizeSalaryBasisValue(staff?.salaryBasis);
  const safeDueDate = dueDate || localDate();
  if (basis === "daily" || basis === "hourly") {
    return { periodStart: safeDueDate, periodEnd: localDate(addCalendarDays(parseDateValue(safeDueDate), 1)), dates: [safeDueDate] };
  }
  return buildPayrollPeriod(safeDueDate, staff ? staffPayrollCycleDay(staff) : cycleDay);
}

function idOf(item) {
  return (item?._id || item?.id || "").toString();
}

function formatMoney(value) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
  })}`;
}

function transactionPeriodLabel(transaction) {
  return transaction?.periodLabel
    || transaction?.payrollPeriodLabel
    || transaction?.payroll?.periodLabel
    || transaction?.payroll?.periodEnd
    || "";
}

function transactionGrossSalary(transaction) {
  return Number(transaction?.grossSalary ?? transaction?.payroll?.grossSalary ?? 0);
}

function transactionNetPay(transaction) {
  return Number(transaction?.netPay ?? transaction?.payroll?.netPay ?? 0);
}

function transactionLoanDeduction(transaction) {
  return Number(transaction?.loanDeduction ?? transaction?.payroll?.loanDeduction ?? 0);
}

function transactionBreakdownText(transaction) {
  const gross = transactionGrossSalary(transaction);
  const emi = transactionLoanDeduction(transaction);
  const net = transactionNetPay(transaction);
  const parts = [];
  if (gross > 0) parts.push(`Gross ${formatMoney(gross)}`);
  if (emi > 0) parts.push(`Deducted ${formatMoney(emi)}`);
  if (net > 0) parts.push(`Net ${formatMoney(net)}`);
  return parts.join(" | ");
}

function transactionDirection(transaction) {
  if (transaction?.direction === "in" || transaction?.direction === "out") return transaction.direction;
  return ["manual_in", "loan_repayment"].includes(transaction?.type) ? "in" : "out";
}

function transactionTitle(transaction) {
  const titles = {
    salary: "Salary payment",
    manual_out: "Payment out",
    manual_in: "Payment in",
    loan_out: "Employee loan paid",
    loan_repayment: "Loan repayment",
    advance_out: "Advance paid",
  };
  return titles[transaction?.type] || "Bank transaction";
}

function staffTransactionTitle(transaction) {
  const titles = {
    salary: "Salary received",
    loan_out: "Loan received",
    advance_out: "Advance received",
    loan_repayment: "EMI payment",
    manual_in: "Payment made",
    manual_out: "Payment received",
  };
  return titles[transaction?.type] || transactionTitle(transaction);
}

function staffTransactionDirection(transaction) {
  if (["salary", "loan_out", "advance_out", "manual_out"].includes(transaction?.type)) return "in";
  if (["loan_repayment", "manual_in"].includes(transaction?.type)) return "out";
  return transactionDirection(transaction);
}

function repaymentKindLabel(item) {
  return item?.category === "advance" ? "Advance" : "Loan";
}

function dayLabels(days = []) {
  if (!days.length) return "No weekly off";
  return days.map((day) => DAY_OPTIONS.find((item) => item.id === Number(day))?.label).filter(Boolean).join(", ");
}

function staffLabel(staff) {
  if (!staff) return "Staff";
  return [staff.name, staff.employeeCode].filter(Boolean).join(" - ");
}

function formatReadableDate(value, options = {}) {
  if (!value) return "--";
  return parseDateValue(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...options });
}

function formatMonthLabel(month) {
  if (!month) return "--";
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function shiftMonth(month, direction) {
  const [year, monthIndex] = (month || localDate().slice(0, 7)).split("-").map(Number);
  const next = new Date(year, monthIndex - 1 + direction, 1);
  return localDate(next).slice(0, 7);
}

function datesInMonth(month) {
  const [year, monthIndex] = (month || localDate().slice(0, 7)).split("-").map(Number);
  const totalDays = new Date(year, monthIndex, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) =>
    `${year}-${String(monthIndex).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`
  );
}

function isWeeklyOffForStaff(staff, date) {
  const offDays = (staff?.department?.weeklyOffDays || []).map(Number);
  return offDays.includes(parseDateValue(date).getDay());
}

function normalizedWeeklyOffDays(department) {
  const days = Array.isArray(department?.weeklyOffDays) ? department.weeklyOffDays : [0];
  return [...new Set(days.map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))];
}

function countWorkingDates(dates = [], department) {
  const offDays = normalizedWeeklyOffDays(department);
  return dates.filter((date) => !offDays.includes(parseDateValue(date).getDay())).length;
}

function monthlyDueDateForWorkDate(date, cycleDay) {
  const safeCycleDay = normalizePayrollCycleDay(cycleDay, 1);
  const workDate = parseDateValue(date || localDate());
  const due = new Date(workDate.getFullYear(), workDate.getMonth(), safeCycleDay);
  if (localDate(due) <= (date || localDate())) due.setMonth(due.getMonth() + 1);
  return localDate(due);
}

function monthlyWorkingDaysForDepartment(department, dueDate, cycleDay) {
  const safeCycleDay = normalizePayrollCycleDay(cycleDay, 1);
  const period = buildPayrollPeriod(payrollDueDateFromValue(safeCycleDay, dueDate || localDate()), safeCycleDay);
  return countWorkingDates(period.dates, department) || WORK_DAYS_PER_MONTH;
}

function estimateHourlyRateForStaff(person, referenceDate = localDate()) {
  const basis = normalizeSalaryBasisValue(person?.salaryBasis);
  const salary = Number(person?.monthlySalary || 0);
  const dailyHours = Math.max(0, Number(person?.expectedHoursPerDay || 0)) || 8;
  if (basis === "hourly") return salary;
  if (basis === "daily") return dailyHours > 0 ? salary / dailyHours : 0;
  const dueDate = monthlyDueDateForWorkDate(referenceDate, staffPayrollCycleDay(person));
  const workingDays = monthlyWorkingDaysForDepartment(person?.department, dueDate, staffPayrollCycleDay(person));
  return workingDays > 0 ? salary / (workingDays * dailyHours) : 0;
}

export default function HRPage() {
  const [active, setActive] = useState("overview");
  const [toolsOpen, setToolsOpen] = useState("");
  const [attendanceSettings, setAttendanceSettings] = useState({
    autoMark: false,
    defaultStatus: "present",
    checkIn: "09:00",
    checkOut: "18:00",
  });
  const [detailStaffId, setDetailStaffId] = useState("");
  const [detailTab, setDetailTab] = useState("attendance");
  const [detailDate, setDetailDate] = useState(localDate());
  const [detailMonth, setDetailMonth] = useState(localDate().slice(0, 7));
  const [detailAttendance, setDetailAttendance] = useState([]);
  const [detailAttendanceDrafts, setDetailAttendanceDrafts] = useState({});
  const [detailAttendanceLoading, setDetailAttendanceLoading] = useState(false);
  const [openAttendanceMenu, setOpenAttendanceMenu] = useState("");
  const [summary, setSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [banks, setBanks] = useState([]);
  const [bankTransactions, setBankTransactions] = useState([]);
  const [loans, setLoans] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const [staffSearch, setStaffSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(localDate());
  const [cycleStartDay, setCycleStartDay] = useState(1);
  const [payrollScope, setPayrollScope] = useState("monthly:1");
  const [payrollDueDate, setPayrollDueDate] = useState(localDate());
  const [attendanceDrafts, setAttendanceDrafts] = useState({});
  const [bankTxnFilter, setBankTxnFilter] = useState({ mode: "all", date: localDate(), month: localDate().slice(0, 7) });
  const [selectedBank, setSelectedBank] = useState(null);
  const [addMoneyBank, setAddMoneyBank] = useState(null);
  const [bankTopUpForm, setBankTopUpForm] = useState(emptyBankTopUp);
  const [payNowBank, setPayNowBank] = useState(null);
  const [bankPaymentForm, setBankPaymentForm] = useState(emptyBankPayment);
  const [clearDuePayroll, setClearDuePayroll] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ bankId: "", amount: "", note: "" });

  // Overtime modal state
  const [overtimeModal, setOvertimeModal] = useState(null); // { staff, date }
  const [overtimeForm, setOvertimeForm] = useState({ type: "hourly", hours: "00", mins: "00", rate: "1x", fixedAmount: "" });
  const [fineModal, setFineModal] = useState(null); // { staff, date }
  const [fineForm, setFineForm] = useState({ hours: "", note: "" });

  const [departmentForm, setDepartmentForm] = useState(emptyDepartment);
  const [editingDepartmentId, setEditingDepartmentId] = useState("");
  const [staffForm, setStaffForm] = useState(emptyStaff);
  const [editingStaffId, setEditingStaffId] = useState("");
  const [bankForm, setBankForm] = useState(emptyBank);
  const [loanForm, setLoanForm] = useState(emptyLoan);

  const activeStaff = useMemo(() => staff.filter((item) => item.status === "active"), [staff]);

  const selectedDetailStaff = useMemo(
    () => staff.find((person) => idOf(person) === detailStaffId) || null,
    [detailStaffId, staff]
  );
  const selectedDetailUsesSingleDay = usesSingleDayAttendance(selectedDetailStaff);

  const filteredStaff = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    return staff.filter((item) => {
      const departmentId = idOf(item.department);
      const matchesDepartment = !departmentFilter || departmentId === departmentFilter;
      const text = [item.name, item.employeeCode, item.phone, item.email, item.designation, item.department?.name]
        .filter(Boolean).join(" ").toLowerCase();
      return matchesDepartment && (!q || text.includes(q));
    });
  }, [departmentFilter, staff, staffSearch]);

  const attendanceByStaff = useMemo(() => {
    const map = new Map();
    attendance.forEach((item) => map.set(idOf(item.staff), item));
    return map;
  }, [attendance]);

  const attendanceDaySummary = useMemo(() => {
    const counts = { present: 0, absent: 0, half_day: 0, paid_leave: 0, weekly_off: 0 };
    activeStaff.forEach((person) => {
      const record = attendanceByStaff.get(idOf(person));
      if (record?.status === "present") counts.present += 1;
      else if (record?.status === "absent") counts.absent += 1;
      else if (record?.status === "half_day") counts.half_day += 1;
      else if (record?.status === "paid_leave") counts.paid_leave += 1;
      else if (isWeeklyOffForStaff(person, attendanceDate)) counts.weekly_off += 1;
    });
    return counts;
  }, [activeStaff, attendanceByStaff, attendanceDate]);

  const attendanceRows = useMemo(
    () => activeStaff
      .map((person, index) => ({ person, index, marked: attendanceByStaff.has(idOf(person)) }))
      .sort((a, b) => { if (a.marked !== b.marked) return a.marked ? 1 : -1; return a.index - b.index; })
      .map((item) => item.person),
    [activeStaff, attendanceByStaff]
  );

  const cyclePayrolls = useMemo(
    () => payrolls.filter((item) => payrollMatchesScope(item, payrollScope)),
    [payrollScope, payrolls]
  );

  const currentPayrollDueDate = useMemo(
    () => normalizePayrollDateForScope(payrollDueDate || localDate(), payrollScope),
    [payrollDueDate, payrollScope]
  );

  const currentCyclePayrolls = useMemo(
    () => cyclePayrolls.filter((item) => item.periodEnd === currentPayrollDueDate),
    [currentPayrollDueDate, cyclePayrolls]
  );

  const payrollTotals = useMemo(
    () => currentCyclePayrolls.reduce((acc, item) => {
      acc.gross += Number(item.grossSalary || 0);
      acc.net += Number(item.netPay || 0);
      acc.loan += Number(item.loanDeduction || 0);
      acc.deductions += Number(item.attendanceDeduction || 0);
      acc.overtime += Number(item.overtimeAmount || 0);
      acc.fine += Number(item.fineAmount || 0);
      acc.paid += Number(item.totalPaid || 0);
      if (item.status !== "paid") acc.dues += Number(item.balanceDue ?? item.netPay ?? 0);
      return acc;
    }, { gross: 0, net: 0, loan: 0, deductions: 0, overtime: 0, fine: 0, paid: 0, dues: 0 }),
    [currentCyclePayrolls]
  );

  const payrollByStaff = useMemo(() => {
    const map = new Map();
    currentCyclePayrolls.forEach((item) => map.set(idOf(item.staff), item));
    return map;
  }, [currentCyclePayrolls]);

  const staffDueSummaryByStaff = useMemo(() => {
    const map = new Map();
    payrolls
      .filter((item) => item.status !== "paid" && Number(item.balanceDue ?? item.netPay ?? 0) > 0)
      .forEach((item) => {
        const staffId = idOf(item.staff);
        const current = map.get(staffId) || { amount: 0, hours: 0, count: 0, payrolls: [] };
        const basis = normalizeSalaryBasisValue(item.salaryBasis || item.staff?.salaryBasis);
        current.amount += Number(item.balanceDue ?? item.netPay ?? 0);
        if (basis === "hourly") current.hours += Number(item.totalWorkHours || 0);
        current.count += 1;
        current.payrolls.push(item);
        map.set(staffId, current);
      });
    map.forEach((summary) => {
      summary.payrolls.sort((a, b) => new Date(a.periodEnd || a.createdAt || 0) - new Date(b.periodEnd || b.createdAt || 0));
      summary.payroll = summary.payrolls[0] || null;
      summary.hours = Math.round(summary.hours * 100) / 100;
    });
    return map;
  }, [payrolls]);

  const selectedPayroll = useMemo(
    () => selectedDetailStaff ? payrollByStaff.get(idOf(selectedDetailStaff)) || null : null,
    [payrollByStaff, selectedDetailStaff]
  );

  const payrollRows = useMemo(
    () => activeStaff.map((person) => ({ person, payroll: payrollByStaff.get(idOf(person)) })),
    [activeStaff, payrollByStaff]
  );

  const detailAttendanceByDate = useMemo(() => {
    const map = new Map();
    detailAttendance.forEach((item) => map.set(item.date, item));
    return map;
  }, [detailAttendance]);

  const detailAttendanceSummary = useMemo(() => {
    const counts = { present: 0, absent: 0, half_day: 0, paid_leave: 0, weekly_off: 0 };
    if (!selectedDetailStaff) return counts;
    const summaryDates = selectedDetailUsesSingleDay ? [detailDate] : datesInMonth(detailMonth);
    summaryDates.forEach((date) => {
      const record = detailAttendanceByDate.get(date);
      if (record?.status === "present") counts.present += 1;
      else if (record?.status === "absent") counts.absent += 1;
      else if (record?.status === "half_day") counts.half_day += 1;
      else if (record?.status === "paid_leave") counts.paid_leave += 1;
      else if (isWeeklyOffForStaff(selectedDetailStaff, date)) counts.weekly_off += 1;
    });
    return counts;
  }, [detailAttendanceByDate, detailDate, detailMonth, selectedDetailStaff, selectedDetailUsesSingleDay]);

  const selectedStaffTransactions = useMemo(() => {
    if (!selectedDetailStaff) return [];
    const selectedId = idOf(selectedDetailStaff);
    return bankTransactions.filter((t) => idOf(t.staff) === selectedId);
  }, [bankTransactions, selectedDetailStaff]);

  const activeLoans = useMemo(
    () => loans.filter((loan) => loan.status === "active" && Number(loan.outstanding || 0) > 0),
    [loans]
  );

  const selectedBankAccount = useMemo(() => {
    const selectedId = idOf(selectedBank);
    return banks.find((bank) => idOf(bank) === selectedId) || banks[0] || null;
  }, [banks, selectedBank]);

  const selectedPaymentBank = useMemo(() => (
    banks.find((bank) => idOf(bank) === bankPaymentForm.bankId) || selectedBankAccount || banks[0] || null
  ), [bankPaymentForm.bankId, banks, selectedBankAccount]);

  const selectedPaymentStaff = useMemo(() => (
    staff.find((person) => idOf(person) === bankPaymentForm.staff) || null
  ), [bankPaymentForm.staff, staff]);

  const selectedPaymentLoans = useMemo(() => {
    if (!bankPaymentForm.staff) return [];
    return activeLoans.filter((loan) => idOf(loan.staff) === bankPaymentForm.staff);
  }, [activeLoans, bankPaymentForm.staff]);

  const selectedPaymentLoan = useMemo(() => (
    selectedPaymentLoans.find((loan) => idOf(loan) === bankPaymentForm.loan) || null
  ), [bankPaymentForm.loan, selectedPaymentLoans]);

  const selectedPaymentPayrolls = useMemo(() => {
    if (!bankPaymentForm.staff) return [];
    return payrolls
      .filter((payroll) => idOf(payroll.staff) === bankPaymentForm.staff && payroll.status !== "paid" && Number(payroll.balanceDue ?? payroll.netPay ?? 0) > 0)
      .sort((a, b) => new Date(a.periodEnd || a.createdAt || 0) - new Date(b.periodEnd || b.createdAt || 0));
  }, [bankPaymentForm.staff, payrolls]);

  const selectedPaymentPayroll = useMemo(() => (
    selectedPaymentPayrolls.find((payroll) => idOf(payroll) === bankPaymentForm.payroll) || null
  ), [bankPaymentForm.payroll, selectedPaymentPayrolls]);

  const bankPaymentPreview = useMemo(() => {
    const amount = Number(bankPaymentForm.amount || 0);
    const emi = Number(bankPaymentForm.emi || 0);
    const bankBalance = Number(selectedPaymentBank?.balance || 0);
    const direction = bankPaymentForm.direction;
    const nextBankBalance = direction === "in" ? bankBalance + amount : bankBalance - amount;
    const selectedLoanOutstanding = Number(selectedPaymentLoan?.outstanding || 0);
    const loanRemaining = selectedPaymentLoan ? Math.max(0, selectedLoanOutstanding - amount) : 0;
    const selectedPayrollDue = Number(selectedPaymentPayroll?.balanceDue ?? selectedPaymentPayroll?.netPay ?? 0);
    const salaryRemaining = selectedPaymentPayroll ? Math.max(0, selectedPayrollDue - amount) : 0;
    return {
      amount,
      emi,
      months: amount > 0 && emi > 0 ? Math.ceil(amount / emi) : 0,
      nextBankBalance,
      loanRemaining,
      salaryRemaining,
    };
  }, [bankPaymentForm.amount, bankPaymentForm.direction, bankPaymentForm.emi, selectedPaymentBank, selectedPaymentLoan, selectedPaymentPayroll]);

  const bankTransactionRows = useMemo(
    () => bankTransactions
      .map((t) => ({
        id: idOf(t) || `${idOf(t.bank)}-${t.paidAt}`,
        bankId: idOf(t.bank),
        date: t.paidAt,
        type: t.type,
        direction: transactionDirection(t),
        title: transactionTitle(t),
        name: t.staff?.name || t.beneficiaryName || "Receiver",
        source: t.bank?.name || "--",
        amount: Number(t.amount || 0),
        note: t.note || "",
        periodLabel: transactionPeriodLabel(t),
        grossSalary: transactionGrossSalary(t),
        netPay: transactionNetPay(t),
        loanDeduction: transactionLoanDeduction(t),
        breakdown: transactionBreakdownText(t),
        loanOutstandingAfter: Number(t.loanOutstandingAfter || 0),
        loanCategory: t.loan?.category || (t.type === "advance_out" ? "advance" : "loan"),
        hasLoanBalance: Boolean(t.loan || ["loan_out", "advance_out", "loan_repayment"].includes(t.type)),
        bankBalanceAfter: Number(t.bankBalanceAfter || 0),
      }))
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    [bankTransactions]
  );

  const allBankTransactionTotals = useMemo(
    () => bankTransactionRows.reduce((acc, item) => {
      if (item.direction === "in") acc.in += item.amount;
      else acc.out += item.amount;
      return acc;
    }, { in: 0, out: 0 }),
    [bankTransactionRows]
  );

  const repaymentBreakdown = useMemo(
    () => activeLoans.reduce((acc, item) => {
      if (item.category === "advance") acc.advance += Number(item.outstanding || 0);
      else acc.loan += Number(item.outstanding || 0);
      acc.deduction += Number(item.emi || 0);
      acc.count += 1;
      return acc;
    }, { loan: 0, advance: 0, deduction: 0, count: 0 }),
    [activeLoans]
  );

  const recentBankTransactions = useMemo(
    () => bankTransactionRows.slice(0, 6),
    [bankTransactionRows]
  );

  const filteredBankTransactions = useMemo(() => {
    return bankTransactionRows.filter((item) => {
      if (selectedBankAccount && item.bankId !== idOf(selectedBankAccount)) return false;
      if (!item.date || bankTxnFilter.mode === "all") return true;
      const txDate = localDate(new Date(item.date));
      if (bankTxnFilter.mode === "date") return txDate === bankTxnFilter.date;
      if (bankTxnFilter.mode === "month") return txDate.slice(0, 7) === bankTxnFilter.month;
      return true;
    });
  }, [bankTransactionRows, bankTxnFilter, selectedBankAccount]);

  const bankTransactionTotals = useMemo(
    () => filteredBankTransactions.reduce((acc, item) => {
      if (item.direction === "in") acc.in += item.amount;
      else acc.out += item.amount;
      return acc;
    }, { in: 0, out: 0 }),
    [filteredBankTransactions]
  );

  const selectedStaffFormDepartment = useMemo(
    () => departments.find((department) => idOf(department) === staffForm.department) || null,
    [departments, staffForm.department]
  );

  const staffSalaryPreview = useMemo(() => {
    const amount = Number(staffForm.monthlySalary || 0);
    const dailyHours = Math.max(0, Number(staffForm.expectedHoursPerDay || 0)) || 8;
    const basis = normalizeSalaryBasisValue(staffForm.salaryBasis);
    const cycleDay = normalizePayrollCycleDay(staffForm.payrollCycleDay || cycleStartDay, cycleStartDay);
    const monthlyDueDate = monthlyDueDateForWorkDate(attendanceDate || localDate(), cycleDay);
    const monthlyWorkingDays = monthlyWorkingDaysForDepartment(selectedStaffFormDepartment, monthlyDueDate, cycleDay);

    if (basis === "hourly") {
      const daily = amount * dailyHours;
      return [
        { label: "Working days", value: `${monthlyWorkingDays} days`, plain: true },
        { label: "Daily salary", value: daily },
        { label: "Monthly salary", value: daily * monthlyWorkingDays },
      ];
    }

    if (basis === "daily") {
      return [
        { label: "Daily salary", value: amount },
        { label: "Hourly salary", value: amount / dailyHours },
        { label: "Monthly estimate", value: amount * monthlyWorkingDays },
      ];
    }

    const daily = amount / monthlyWorkingDays;
    return [
      { label: "Working days", value: `${monthlyWorkingDays} days`, plain: true },
      { label: "Daily salary", value: daily },
      { label: "Hourly salary", value: daily / dailyHours },
    ];
  }, [attendanceDate, cycleStartDay, selectedStaffFormDepartment, staffForm.expectedHoursPerDay, staffForm.monthlySalary, staffForm.payrollCycleDay, staffForm.salaryBasis]);

  const showNotice = useCallback((type, text) => setNotice({ type, text }), []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const payrollBasis = payrollScopeBasis(payrollScope);
      const payrollCycleQuery = payrollBasis === "monthly" ? `&cycleStartDay=${payrollScopeCycleDay(payrollScope, cycleStartDay)}` : "";
      const [summaryRes, departmentsRes, staffRes, attendanceRes, banksRes, bankTransactionsRes, loansRes, payrollRes, openPayrollRes] = await Promise.all([
        API.get("/hr/summary"),
        API.get("/hr/departments"),
        API.get("/hr/staff"),
        API.get(`/hr/attendance?date=${attendanceDate}`),
        API.get("/hr/banks"),
        API.get("/hr/banks/transactions"),
        API.get("/hr/loans"),
        API.get(`/hr/payroll?periodEnd=${payrollDueDate}&salaryBasis=${payrollBasis}${payrollCycleQuery}`),
        API.get("/hr/payroll?open=1"),
      ]);
      const combinedPayrolls = new Map();
      [...(payrollRes.data?.data || []), ...(openPayrollRes.data?.data || [])].forEach((item) => combinedPayrolls.set(idOf(item), item));
      setSummary(summaryRes.data?.data || null);
      setDepartments(departmentsRes.data?.data || []);
      setStaff(staffRes.data?.data || []);
      setAttendance(attendanceRes.data?.data || []);
      setBanks(banksRes.data?.data || []);
      setBankTransactions(bankTransactionsRes.data?.data || []);
      setLoans(loansRes.data?.data || []);
      setPayrolls(Array.from(combinedPayrolls.values()));
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not load HR data.");
    } finally {
      setLoading(false);
    }
  }, [attendanceDate, cycleStartDay, payrollDueDate, payrollScope, showNotice]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const res = await API.get("/hr/payroll/settings");
        if (cancelled) return;
        const loadedDay = Number(res.data?.data?.cycleStartDay || 1);
        const day = PAYROLL_CYCLE_OPTIONS.includes(loadedDay) ? loadedDay : 1;
        setCycleStartDay(day);
        setPayrollScope((current) => (current.startsWith("monthly:") ? `monthly:${day}` : current));
        setPayrollDueDate((current) => normalizePayrollDateForScope(current || localDate(), `monthly:${day}`));
      } catch { /* optional */ }
    };
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const nextDrafts = {};
    activeStaff.forEach((person) => {
      const existing = attendanceByStaff.get(idOf(person));
      nextDrafts[idOf(person)] = {
        status: existing?.status || "",
        checkIn: existing?.checkIn || "",
        checkOut: existing?.checkOut || "",
        workHours: existing?.workHours ?? "",
        overtimeHours: existing?.overtimeHours ?? "",
        fineHours: existing?.fineHours ?? "",
        note: existing?.note || "",
      };
    });
    setAttendanceDrafts(nextDrafts);
  }, [activeStaff, attendanceByStaff]);

  useEffect(() => {
    let cancelled = false;
    const loadDetailAttendance = async () => {
      if (!detailStaffId) { setDetailAttendance([]); return; }
      setDetailAttendanceLoading(true);
      try {
        const query = selectedDetailUsesSingleDay
          ? `/hr/attendance?staff=${detailStaffId}&date=${detailDate}`
          : `/hr/attendance?staff=${detailStaffId}&month=${detailMonth}`;
        const res = await API.get(query);
        if (!cancelled) setDetailAttendance(res.data?.data || []);
      } catch (error) {
        if (!cancelled) { setDetailAttendance([]); showNotice("error", error.response?.data?.error || "Could not load staff attendance."); }
      } finally {
        if (!cancelled) setDetailAttendanceLoading(false);
      }
    };
    loadDetailAttendance();
    return () => { cancelled = true; };
  }, [detailDate, detailMonth, detailStaffId, selectedDetailUsesSingleDay, showNotice]);

  useEffect(() => {
    const nextDrafts = {};
    detailAttendance.forEach((record) => {
      nextDrafts[record.date] = {
        status: record.status || "",
        checkIn: record.checkIn || "",
        checkOut: record.checkOut || "",
        workHours: record.workHours ?? "",
        overtimeHours: record.overtimeHours ?? "",
        fineHours: record.fineHours ?? "",
        note: record.note || "",
      };
    });
    setDetailAttendanceDrafts(nextDrafts);
  }, [detailAttendance]);

  const refreshSummary = async () => {
    try {
      const res = await API.get("/hr/summary");
      setSummary(res.data?.data || null);
    } catch { /* non-blocking */ }
  };

  const openStaffDetail = (person, tab = "attendance") => {
    const baseDate = attendanceDate || localDate();
    const nextScope = payrollScopeForStaff(person);
    setDetailStaffId(idOf(person));
    setDetailTab(tab);
    setDetailDate(baseDate);
    setDetailMonth(baseDate.slice(0, 7));
    setPayrollScope(nextScope);
    setPayrollDueDate(normalizePayrollDateForScope(payrollDueDateForStaff(person, baseDate), nextScope));
  };

  const changeDetailDate = (nextDate) => {
    const safeDate = nextDate || localDate();
    setDetailDate(safeDate);
    setDetailMonth(safeDate.slice(0, 7));
    if (selectedDetailStaff && usesSingleDayAttendance(selectedDetailStaff)) {
      const nextScope = payrollScopeForStaff(selectedDetailStaff);
      setPayrollScope(nextScope);
      setPayrollDueDate(safeDate);
    }
  };

  const staffBalanceValue = (person) => {
    const dueSummary = staffDueSummaryByStaff.get(idOf(person));
    if (dueSummary) return dueSummary.amount;
    const payroll = payrollByStaff.get(idOf(person));
    if (payroll) return Number(payroll.balanceDue ?? payroll.netPay ?? 0);
    if (["hourly", "daily"].includes(normalizeSalaryBasisValue(person.salaryBasis))) return 0;
    return Number(person.monthlySalary || 0);
  };

  const refreshDuePayrollForStaff = async (person, date) => {
    const basis = normalizeSalaryBasisValue(person.salaryBasis);
    if (basis !== "hourly" && basis !== "daily") return;
    if (!date || date > localDate()) return;
    try {
      const res = await API.post("/hr/payroll/generate", {
        dueDate: date,
        cycleStartDay: staffPayrollCycleDay(person),
        salaryBasis: basis,
        staff: idOf(person),
      });
      mergePayrolls(res.data?.data || []);
      refreshSummary();
    } catch {
      // Attendance save should stay successful even if payroll refresh is not due yet.
    }
  };

  const mergeAttendanceRecord = (record, date) => {
    const staffId = idOf(record.staff);
    setDetailAttendance((prev) => {
      if (record.date?.slice(0, 7) !== detailMonth) return prev;
      const exists = prev.some((item) => item.date === record.date && idOf(item.staff) === staffId);
      return exists ? prev.map((item) => (item.date === record.date && idOf(item.staff) === staffId ? record : item)) : [record, ...prev];
    });
    if (date === attendanceDate) {
      setAttendance((prev) => {
        const exists = prev.some((item) => idOf(item.staff) === staffId);
        return exists ? prev.map((item) => (idOf(item.staff) === staffId ? record : item)) : [record, ...prev];
      });
    }
  };

  const saveDepartment = async (event) => {
    event.preventDefault();
    if (!departmentForm.name.trim()) return showNotice("error", "Department name is required.");
    setSaving(true);
    try {
      const payload = {
        ...departmentForm,
        weeklyOffDays: departmentForm.weeklyOffDays.map(Number),
        leavePolicy: { paidLeaves: Number(departmentForm.leavePolicy?.paidLeaves || 0), shortLeaves: Number(departmentForm.leavePolicy?.shortLeaves || 0) },
      };
      const res = editingDepartmentId
        ? await API.patch(`/hr/departments/${editingDepartmentId}`, payload)
        : await API.post("/hr/departments", payload);
      const saved = res.data.data;
      setDepartments((prev) => editingDepartmentId ? prev.map((item) => (idOf(item) === editingDepartmentId ? saved : item)) : [saved, ...prev]);
      setDepartmentForm(emptyDepartment);
      setEditingDepartmentId("");
      showNotice("success", editingDepartmentId ? "Department updated." : "Department added.");
      if (toolsOpen === "department") setToolsOpen("");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not save department.");
    } finally {
      setSaving(false);
    }
  };

  const saveStaff = async (event) => {
    event.preventDefault();
    if (!staffForm.name.trim()) return showNotice("error", "Staff name is required.");
    setSaving(true);
    try {
      const payload = {
        ...staffForm,
        department: staffForm.department || null,
        monthlySalary: Number(staffForm.monthlySalary || 0),
        salaryBasis: normalizeSalaryBasisValue(staffForm.salaryBasis),
        expectedHoursPerDay: Number(staffForm.expectedHoursPerDay || 8),
        payrollCycleDay: normalizePayrollCycleDay(staffForm.payrollCycleDay),
      };
      const res = editingStaffId ? await API.patch(`/hr/staff/${editingStaffId}`, payload) : await API.post("/hr/staff", payload);
      const saved = res.data.data;
      setStaff((prev) => editingStaffId ? prev.map((item) => (idOf(item) === editingStaffId ? saved : item)) : [saved, ...prev]);
      setStaffForm({ ...emptyStaff, payrollCycleDay: cycleStartDay });
      setEditingStaffId("");
      showNotice("success", editingStaffId ? "Staff updated." : "Staff added.");
      if (toolsOpen === "staff") setToolsOpen("");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not save staff.");
    } finally {
      setSaving(false);
    }
  };

  const archiveStaff = async (person) => {
    try {
      const res = await API.patch(`/hr/staff/${idOf(person)}`, { status: "inactive" });
      setStaff((prev) => prev.map((item) => (idOf(item) === idOf(person) ? res.data.data : item)));
      showNotice("success", "Staff marked inactive.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not update staff status.");
    }
  };

  const deleteStaff = async (person) => {
    const staffId = idOf(person);
    if (!window.confirm(`Delete ${person.name}? This will also delete their attendance, payroll, and loan records.`)) return;
    try {
      await API.delete(`/hr/staff/${staffId}`);
      setStaff((prev) => prev.filter((item) => idOf(item) !== staffId));
      setAttendance((prev) => prev.filter((item) => idOf(item.staff) !== staffId));
      setPayrolls((prev) => prev.filter((item) => idOf(item.staff) !== staffId));
      setBankTransactions((prev) => prev.filter((item) => idOf(item.staff) !== staffId));
      setLoans((prev) => prev.filter((item) => idOf(item.staff) !== staffId));
      if (editingStaffId === staffId) { setEditingStaffId(""); setStaffForm(emptyStaff); }
      showNotice("success", "Staff deleted.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not delete staff.");
    }
  };

  const deleteDepartment = async (department) => {
    const departmentId = idOf(department);
    if (!window.confirm(`Delete ${department.name}?`)) return;
    try {
      await API.delete(`/hr/departments/${departmentId}`);
      setDepartments((prev) => prev.filter((item) => idOf(item) !== departmentId));
      if (editingDepartmentId === departmentId) { setEditingDepartmentId(""); setDepartmentForm(emptyDepartment); }
      showNotice("success", "Department deleted.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not delete department.");
    }
  };

  const quickMarkAttendance = async (person, status) => {
    const staffId = idOf(person);
    const shift = person.department?.shift || {};
    const expectedHours = Number(person.expectedHoursPerDay || 8);
    const isHourly = normalizeSalaryBasisValue(person.salaryBasis) === "hourly";
    const isWorkStatus = status === "present" || status === "half_day" || status === "short_leave";
    const workHours = status === "present" ? (isHourly ? undefined : expectedHours) : status === "half_day" ? expectedHours / 2 : status === "short_leave" ? Math.max(0, expectedHours - 2) : 0;
    const quickDraft = { status, checkIn: isWorkStatus ? shift.start || "09:00" : "", checkOut: isWorkStatus ? shift.end || "18:00" : "", workHours, overtimeHours: attendanceDrafts[staffId]?.overtimeHours || "", fineHours: attendanceDrafts[staffId]?.fineHours || "", note: attendanceDrafts[staffId]?.note || "" };
    setAttendanceDrafts((prev) => ({ ...prev, [staffId]: quickDraft }));
    try {
      const res = await API.post("/hr/attendance", { staff: staffId, date: attendanceDate, ...quickDraft });
      const saved = res.data.data;
      setAttendance((prev) => {
        const exists = prev.some((item) => idOf(item.staff) === staffId);
        return exists ? prev.map((item) => (idOf(item.staff) === staffId ? saved : item)) : [saved, ...prev];
      });
      await refreshDuePayrollForStaff(person, attendanceDate);
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not mark attendance.");
    }
  };

  const updateDetailAttendanceDraft = (date, field, value) => {
    setDetailAttendanceDrafts((prev) => ({ ...prev, [date]: { ...(prev[date] || {}), [field]: value } }));
  };

  const saveDetailAttendanceDraft = async (person, date, overrides = {}) => {
    const record = detailAttendanceByDate.get(date);
    const draft = {
      status: record?.status || "",
      checkIn: record?.checkIn || "",
      checkOut: record?.checkOut || "",
      workHours: record?.workHours ?? "",
      overtimeHours: record?.overtimeHours ?? "",
      fineHours: record?.fineHours ?? "",
      note: record?.note || "",
      ...(detailAttendanceDrafts[date] || {}),
      ...overrides,
    };
    const status = draft.status || "present";
    const shift = person.department?.shift || {};
    const isWorkStatus = status === "present" || status === "half_day" || status === "short_leave";
    const isHourly = normalizeSalaryBasisValue(person.salaryBasis) === "hourly";
    const expectedHours = Number(person.expectedHoursPerDay || 8);
    const defaultStatusHours = status === "present"
      ? expectedHours
      : status === "half_day"
        ? expectedHours / 2
        : status === "short_leave"
          ? Math.max(0, expectedHours - 2)
          : 0;
    const checkIn = isWorkStatus ? draft.checkIn || shift.start || "" : "";
    const defaultCheckOut = checkIn && (status === "half_day" || status === "short_leave")
      ? addHoursToTime(checkIn, defaultStatusHours)
      : shift.end || "";
    const checkOut = isWorkStatus ? draft.checkOut || defaultCheckOut : "";
    let workHours = 0;

    if (isHourly) {
      if (status === "present" && (!checkIn || !checkOut)) {
        showNotice("error", "Enter check-in and check-out for hourly staff.");
        setDetailAttendanceDrafts((prev) => ({ ...prev, [date]: { ...draft, status, checkIn, checkOut } }));
        return;
      }
      workHours = checkIn && checkOut ? calculateWorkHours(checkIn, checkOut) : defaultStatusHours;
    } else {
      workHours = defaultStatusHours;
    }

    try {
      const res = await API.post("/hr/attendance", {
        staff: idOf(person), date, status,
        checkIn,
        checkOut,
        workHours,
        overtimeHours: draft.overtimeHours === "" ? 0 : Number(draft.overtimeHours ?? record?.overtimeHours ?? 0),
        fineHours: draft.fineHours === "" ? 0 : Number(draft.fineHours ?? record?.fineHours ?? 0),
        note: draft.note || "",
      });
      mergeAttendanceRecord(res.data.data, date);
      await refreshDuePayrollForStaff(person, date);
      showNotice("success", "Attendance updated.");
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not update attendance.");
    }
  };

  const applyDetailAttendanceMenuAction = async (person, date, action) => {
    setOpenAttendanceMenu("");
    if (action === "overtime") {
      setOvertimeModal({ staff: person, date });
      setOvertimeForm({ type: "hourly", hours: "00", mins: "00", rate: "1x", fixedAmount: "" });
      return;
    }
    if (action === "fine") {
      const existing = detailAttendanceDrafts[date] || detailAttendanceByDate.get(date) || {};
      setFineModal({ staff: person, date });
      setFineForm({ hours: existing.fineHours ?? "", note: existing.note || "" });
      return;
    }
    if (action === "weekly_off") {
      showNotice("error", "Weekly off comes from the staff department settings.");
      return;
    }
    updateDetailAttendanceDraft(date, "status", action);
    await saveDetailAttendanceDraft(person, date, { status: action });
  };

  const saveOvertime = async () => {
    if (!overtimeModal) return;
    const { staff: person, date } = overtimeModal;
    const totalHours = Number(overtimeForm.hours || 0) + Number(overtimeForm.mins || 0) / 60;
    if (totalHours <= 0 && overtimeForm.type === "hourly") {
      showNotice("error", "Enter overtime hours greater than zero.");
      return;
    }
    updateDetailAttendanceDraft(date, "overtimeHours", totalHours.toFixed(2));
    await saveDetailAttendanceDraft(person, date, { overtimeHours: totalHours.toFixed(2) });
    setOvertimeModal(null);
  };

  const saveFine = async () => {
    if (!fineModal) return;
    const { staff: person, date } = fineModal;
    const existing = detailAttendanceDrafts[date] || detailAttendanceByDate.get(date) || {};
    const hours = Number(fineForm.hours || 0);
    if (hours < 0) {
      showNotice("error", "Fine hours cannot be negative.");
      return;
    }
    updateDetailAttendanceDraft(date, "fineHours", hours);
    await saveDetailAttendanceDraft(person, date, { fineHours: hours, note: fineForm.note || existing.note || "" });
    setFineModal(null);
    setFineForm({ hours: "", note: "" });
  };

  const saveBank = async (event) => {
    event.preventDefault();
    if (!bankForm.name.trim()) return showNotice("error", "Bank name is required.");
    setSaving(true);
    try {
      const res = await API.post("/hr/banks", { ...bankForm, balance: Number(bankForm.balance || 0) });
      setBanks((prev) => [res.data.data, ...prev]);
      setBankForm(emptyBank);
      showNotice("success", "Bank added.");
      if (toolsOpen === "bank") setToolsOpen("");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not save bank.");
    } finally {
      setSaving(false);
    }
  };

  const openBankPayment = (bank = selectedBankAccount, defaults = {}) => {
    const targetBank = bank || selectedBankAccount || banks[0] || null;
    const staffId = defaults.staff || "";
    const firstLoan = staffId ? activeLoans.find((loan) => idOf(loan.staff) === staffId) : null;
    const firstPayroll = staffId
      ? payrolls
        .filter((payroll) => idOf(payroll.staff) === staffId && payroll.status !== "paid" && Number(payroll.balanceDue ?? payroll.netPay ?? 0) > 0)
        .sort((a, b) => new Date(a.periodEnd || a.createdAt || 0) - new Date(b.periodEnd || b.createdAt || 0))[0]
      : null;
    const purpose = defaults.purpose || (defaults.direction === "in" ? (firstLoan ? "loan" : "general") : "salary");
    const amount = defaults.amount ?? (purpose === "salary" && firstPayroll ? (firstPayroll.balanceDue ?? firstPayroll.netPay ?? "") : "");
    setPayNowBank(targetBank || {});
    setBankPaymentForm({
      ...emptyBankPayment,
      bankId: idOf(targetBank) || idOf(banks[0]) || "",
      direction: defaults.direction || "out",
      partyType: defaults.partyType || "employee",
      purpose,
      staff: staffId,
      loan: defaults.loan || (purpose === "loan" && firstLoan ? idOf(firstLoan) : ""),
      payroll: defaults.payroll || (purpose === "salary" && firstPayroll ? idOf(firstPayroll) : ""),
      amount,
      issueDate: localDate(),
    });
  };

  const openAddBankMoney = (bank = selectedBankAccount) => {
    const targetBank = bank || selectedBankAccount || banks[0] || null;
    setAddMoneyBank(targetBank || {});
    setBankTopUpForm(emptyBankTopUp);
  };

  const addMoneyToBank = async () => {
    if (!addMoneyBank) return;
    const amount = Number(bankTopUpForm.amount || 0);
    if (amount <= 0) return showNotice("error", "Enter an amount greater than zero.");
    setSaving(true);
    try {
      const res = await API.post(`/hr/banks/${idOf(addMoneyBank)}/add-money`, {
        amount,
        note: bankTopUpForm.note,
      });
      setBanks((prev) => prev.map((item) => (idOf(item) === idOf(res.data.data) ? res.data.data : item)));
      if (res.data.transaction) setBankTransactions((prev) => [res.data.transaction, ...prev]);
      setAddMoneyBank(null);
      setBankTopUpForm(emptyBankTopUp);
      showNotice("success", "Money added to bank.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not add money.");
    } finally {
      setSaving(false);
    }
  };

  const payFromBank = async () => {
    if (!payNowBank) return;
    const bankId = bankPaymentForm.bankId || idOf(selectedPaymentBank);
    if (!bankId) return showNotice("error", "Add or select a bank first.");
    if (Number(bankPaymentForm.amount || 0) <= 0) return showNotice("error", "Enter an amount greater than zero.");
    if (bankPaymentForm.partyType === "employee" && !bankPaymentForm.staff) return showNotice("error", "Select an employee.");
    if (
      bankPaymentForm.partyType === "employee"
      && bankPaymentForm.direction === "out"
      && bankPaymentForm.purpose === "salary"
      && !bankPaymentForm.payroll
    ) {
      return showNotice("error", "Select generated payroll for salary payment.");
    }
    if (
      bankPaymentForm.partyType === "employee"
      && bankPaymentForm.direction === "out"
      && ["loan", "advance"].includes(bankPaymentForm.purpose)
      && Number(bankPaymentForm.emi || 0) <= 0
    ) {
      return showNotice("error", "Enter how much should be deducted from salary.");
    }
    if (
      bankPaymentForm.partyType === "employee"
      && bankPaymentForm.direction === "in"
      && bankPaymentForm.purpose === "loan"
      && !bankPaymentForm.loan
    ) {
      return showNotice("error", "Select the employee loan to reduce.");
    }
    if (bankPaymentForm.partyType === "other" && !bankPaymentForm.beneficiaryName.trim()) {
      return showNotice("error", bankPaymentForm.direction === "in" ? "Sender name is required." : "Receiver name is required.");
    }
    setSaving(true);
    try {
      if (bankPaymentForm.partyType === "employee" && bankPaymentForm.direction === "out" && bankPaymentForm.purpose === "salary") {
        const res = await API.post(`/hr/payroll/${bankPaymentForm.payroll}/pay`, {
          bankId,
          amount: Number(bankPaymentForm.amount || 0),
          note: bankPaymentForm.note,
        });
        setPayrolls((prev) => prev.map((item) => (idOf(item) === idOf(bankPaymentForm.payroll) ? res.data.data : item)));
        if (res.data.bank) setBanks((prev) => prev.map((item) => (idOf(item) === idOf(res.data.bank) ? res.data.bank : item)));
        const loansRes = await API.get("/hr/loans");
        setLoans(loansRes.data?.data || []);
        if (res.data.transaction) setBankTransactions((prev) => [res.data.transaction, ...prev]);
        else { const txRes = await API.get("/hr/banks/transactions"); setBankTransactions(txRes.data?.data || []); }
        setPayNowBank(null);
        setBankPaymentForm(emptyBankPayment);
        showNotice("success", "Salary payment completed.");
        refreshSummary();
        return;
      }
      const payload = {
        ...bankPaymentForm,
        amount: Number(bankPaymentForm.amount || 0),
        emi: Number(bankPaymentForm.emi || 0),
        loan: bankPaymentForm.direction === "in" && bankPaymentForm.purpose === "loan" ? bankPaymentForm.loan : "",
      };
      const res = await API.post(`/hr/banks/${bankId}/payment`, payload);
      setBanks((prev) => prev.map((item) => (idOf(item) === idOf(res.data.bank) ? res.data.bank : item)));
      setBankTransactions((prev) => [res.data.data, ...prev]);
      if (res.data.loan) {
        setLoans((prev) => {
          const exists = prev.some((loan) => idOf(loan) === idOf(res.data.loan));
          return exists
            ? prev.map((loan) => (idOf(loan) === idOf(res.data.loan) ? res.data.loan : loan))
            : [res.data.loan, ...prev];
        });
      }
      if (res.data.payrolls?.length) mergePayrolls(res.data.payrolls);
      setPayNowBank(null);
      setBankPaymentForm(emptyBankPayment);
      showNotice("success", bankPaymentForm.direction === "in" ? "Payment received." : "Payment completed.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not save payment.");
    } finally {
      setSaving(false);
    }
  };

  const saveLoan = async (event) => {
    event.preventDefault();
    if (!loanForm.staff) return showNotice("error", "Select staff for the loan.");
    if (Number(loanForm.amount || 0) <= 0 || Number(loanForm.emi || 0) <= 0) return showNotice("error", "Loan amount and EMI must be greater than zero.");
    setSaving(true);
    try {
      const res = await API.post("/hr/loans", { ...loanForm, amount: Number(loanForm.amount), emi: Number(loanForm.emi) });
      setLoans((prev) => [res.data.data, ...prev]);
      setLoanForm(emptyLoan);
      showNotice("success", "Loan added. EMI will cut during payroll payment.");
      if (toolsOpen === "loan") setToolsOpen("");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not save loan.");
    } finally {
      setSaving(false);
    }
  };

  const closeLoan = async (loan) => {
    try {
      const res = await API.patch(`/hr/loans/${idOf(loan)}`, { status: "closed", outstanding: 0 });
      setLoans((prev) => prev.map((item) => (idOf(item) === idOf(loan) ? res.data.data : item)));
      showNotice("success", "Loan closed.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not close loan.");
    }
  };

  const changePayrollScope = (nextScope) => {
    const currentBasis = payrollScopeBasis(payrollScope);
    const nextBasis = payrollScopeBasis(nextScope);
    setPayrollScope(nextScope);
    if (nextBasis === "monthly") {
      const day = payrollScopeCycleDay(nextScope, cycleStartDay);
      setCycleStartDay(day);
      setPayrollDueDate((current) => normalizePayrollDateForScope(current || localDate(), nextScope));
    } else if (currentBasis === "monthly") {
      setPayrollDueDate(localDate());
    }
  };

  const changePayrollDate = (nextDate) => { setPayrollDueDate(normalizePayrollDateForScope(nextDate, payrollScope)); };
  const stepPayrollDate = (direction) => { setPayrollDueDate((current) => movePayrollDate(current || localDate(), payrollScope, direction)); };

  const savePayrollSetting = async () => {
    const day = payrollScopeCycleDay(payrollScope, cycleStartDay);
    if (!PAYROLL_CYCLE_OPTIONS.includes(day)) return showNotice("error", "Payroll cycle must be 1 to 1, 7 to 7, or 15 to 15.");
    if (payrollScopeBasis(payrollScope) !== "monthly") return showNotice("error", "Select a monthly cycle before saving.");
    try {
      await API.patch("/hr/payroll/settings", { cycleStartDay: day });
      setCycleStartDay(day);
      showNotice("success", `Payroll cycle saved: ${day} to ${day}.`);
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not save payroll cycle.");
    }
  };

  const generatePayroll = async () => {
    const payrollBasis = payrollScopeBasis(payrollScope);
    const day = payrollScopeCycleDay(payrollScope, cycleStartDay);
    if (payrollBasis === "monthly" && !PAYROLL_CYCLE_OPTIONS.includes(day)) return showNotice("error", "Payroll cycle must be 1 to 1, 7 to 7, or 15 to 15.");
    const dueDate = normalizePayrollDateForScope(payrollDueDate || localDate(), payrollScope);
    setPayrollDueDate(dueDate);
    setSaving(true);
    try {
      const res = await API.post("/hr/payroll/generate", { dueDate, cycleStartDay: day, salaryBasis: payrollBasis });
      mergePayrolls(res.data?.data || []);
      showNotice("success", "Payroll generated from attendance, weekly offs, and loan EMI.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not generate payroll.");
    } finally {
      setSaving(false);
    }
  };

  function mergePayrolls(items = []) {
    setPayrolls((prev) => {
      const payrollKey = (item) => `${idOf(item.staff)}:${item.periodEnd || ""}:${normalizeSalaryBasisValue(item.salaryBasis || item.staff?.salaryBasis)}`;
      const nextByStaff = new Map(prev.map((item) => [payrollKey(item), item]));
      items.forEach((item) => nextByStaff.set(payrollKey(item), item));
      return Array.from(nextByStaff.values());
    });
  }

  const generatePayrollForStaff = async (person) => {
    const payrollBasis = payrollScopeBasis(payrollScope);
    const day = payrollScopeCycleDay(payrollScope, cycleStartDay);
    if (payrollBasis === "monthly" && !PAYROLL_CYCLE_OPTIONS.includes(day)) return showNotice("error", "Payroll cycle must be 1 to 1, 7 to 7, or 15 to 15.");
    if (!payrollScopeMatchesStaff(person, payrollScope)) return showNotice("error", `${person.name} is on ${normalizeSalaryBasisValue(person.salaryBasis)} payroll. Select the matching cycle first.`);
    const dueDate = normalizePayrollDateForScope(payrollDueDate || localDate(), payrollScope);
    if (!isPayrollDueOnDate(person, dueDate)) return showNotice("error", `${person.name} does not have payroll due on this date.`);
    setPayrollDueDate(dueDate);
    setSaving(true);
    try {
      const res = await API.post("/hr/payroll/generate", { dueDate, cycleStartDay: day, salaryBasis: payrollBasis, staff: idOf(person) });
      const generated = res.data?.data || [];
      if (generated.length === 0) { showNotice("error", "Payroll was not generated."); return; }
      mergePayrolls(generated);
      showNotice("success", `Payroll added for ${person.name} on ${dueDate}.`);
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not add payroll for this staff.");
    } finally {
      setSaving(false);
    }
  };

  const generateDuePayrollForStaff = async (person, referenceDate = attendanceDate) => {
    const basis = normalizeSalaryBasisValue(person.salaryBasis);
    const dueDate = payrollDueDateForStaff(person, referenceDate || localDate());
    const day = staffPayrollCycleDay(person);
    if (dueDate > localDate()) return showNotice("error", "Payroll cycle is not due yet.");
    if (!isPayrollDueOnDate(person, dueDate)) return showNotice("error", `${person.name} does not have payroll due on this date.`);
    if ((basis === "hourly" || basis === "daily") && referenceDate === attendanceDate && !attendanceByStaff.has(idOf(person))) {
      return showNotice("error", "Mark attendance first, then generate payroll.");
    }

    setSaving(true);
    try {
      const res = await API.post("/hr/payroll/generate", {
        dueDate,
        cycleStartDay: day,
        salaryBasis: basis,
        staff: idOf(person),
      });
      const generated = res.data?.data || [];
      if (generated.length === 0) return showNotice("error", "No payable due was generated.");
      mergePayrolls(generated);
      showNotice("success", "Payroll generated. Use Make Payment to pay salary.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not generate due.");
    } finally {
      setSaving(false);
    }
  };

  const openClearDue = (payroll) => {
    setClearDuePayroll(payroll);
    setPaymentForm({
      bankId: banks[0]?._id || "",
      amount: payroll.balanceDue ?? payroll.netPay ?? "",
      note: "",
    });
  };

  const payPayroll = async () => {
    if (!clearDuePayroll) return;
    const bankId = paymentForm.bankId || banks[0]?._id;
    if (!bankId) return showNotice("error", "Add or select a bank first.");
    try {
      const res = await API.post(`/hr/payroll/${idOf(clearDuePayroll)}/pay`, {
        bankId,
        amount: Number(paymentForm.amount || 0),
        note: paymentForm.note,
      });
      setPayrolls((prev) => prev.map((item) => (idOf(item) === idOf(clearDuePayroll) ? res.data.data : item)));
      if (res.data.bank) setBanks((prev) => prev.map((item) => (idOf(item) === idOf(res.data.bank) ? res.data.bank : item)));
      const loansRes = await API.get("/hr/loans");
      setLoans(loansRes.data?.data || []);
      if (res.data.transaction) setBankTransactions((prev) => [res.data.transaction, ...prev]);
      else { const txRes = await API.get("/hr/banks/transactions"); setBankTransactions(txRes.data?.data || []); }
      setClearDuePayroll(null);
      showNotice("success", "Due cleared and bank balance reduced.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not pay salary.");
    }
  };

  const makeStaffPayment = async (person) => {
    const dueSummary = staffDueSummaryByStaff.get(idOf(person));
    const payroll = dueSummary?.payroll || payrollByStaff.get(idOf(person));
    openBankPayment(selectedBankAccount, {
      staff: idOf(person),
      partyType: "employee",
      direction: "out",
      purpose: "salary",
      payroll: payroll && payroll.status !== "paid" ? idOf(payroll) : "",
      amount: payroll && payroll.status !== "paid" ? (payroll.balanceDue ?? payroll.netPay ?? "") : "",
    });
  };

  const autoMarkUnmarkedAttendance = async () => {
    const candidates = activeStaff.filter((person) => !attendanceByStaff.has(idOf(person)) && !isWeeklyOffForStaff(person, attendanceDate));
    if (candidates.length === 0) { showNotice("success", "No unmarked staff for this date."); return; }
    const status = attendanceSettings.defaultStatus;
    setSaving(true);
    try {
      const records = await Promise.all(candidates.map(async (person) => {
        const expectedHours = Number(person.expectedHoursPerDay || 8);
        const isHourly = normalizeSalaryBasisValue(person.salaryBasis) === "hourly";
        const isWorkStatus = status === "present" || status === "half_day" || status === "short_leave";
        const shift = person.department?.shift || {};
        const checkIn = isWorkStatus ? (isHourly ? shift.start || attendanceSettings.checkIn : attendanceSettings.checkIn) : "";
        const checkOut = isWorkStatus ? (isHourly ? shift.end || attendanceSettings.checkOut : attendanceSettings.checkOut) : "";
        const res = await API.post("/hr/attendance", {
          staff: idOf(person), date: attendanceDate,
          status: isHourly ? "present" : status,
          checkIn,
          checkOut,
          workHours: status === "present" ? (isHourly ? undefined : expectedHours) : status === "half_day" ? expectedHours / 2 : status === "short_leave" ? Math.max(0, expectedHours - 2) : 0,
          overtimeHours: 0, fineHours: 0, note: attendanceSettings.autoMark ? "Auto marked" : "",
        });
        return res.data.data;
      }));
      setAttendance((prev) => {
        const next = new Map(prev.map((item) => [idOf(item.staff), item]));
        records.forEach((item) => next.set(idOf(item.staff), item));
        return Array.from(next.values());
      });
      await Promise.all(candidates.map((person) => refreshDuePayrollForStaff(person, attendanceDate)));
      showNotice("success", `Attendance marked for ${records.length} staff.`);
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not auto mark attendance.");
    } finally {
      setSaving(false);
    }
  };

  // ─── RENDER HELPERS ───────────────────────────────────────────────────────────

  const renderSummaryStrip = (counts) => (
    <div className="hr-summary-strip">
      <div className="hr-summary-cell"><span>Present (P)</span><strong>{counts.present}</strong></div>
      <div className="hr-summary-cell"><span>Absent (A)</span><strong>{counts.absent}</strong></div>
      <div className="hr-summary-cell"><span>Half day (HD)</span><strong>{counts.half_day}</strong></div>
      <div className="hr-summary-cell"><span>Paid Leave (PL)</span><strong>{counts.paid_leave}</strong></div>
      <div className="hr-summary-cell"><span>Weekly off (WO)</span><strong>{counts.weekly_off}</strong></div>
    </div>
  );

  // Main attendance table – mirrors screenshot 1
  const renderAttendanceWorkspace = () => (
    <section className="hr-main-section">
      {/* Header */}
      <div className="hr-section-topbar">
        <h1>Staff Attendance &amp; Payroll</h1>
        <div className="hr-topbar-actions">
          <button className="hr-btn hr-btn-ghost" onClick={() => { setToolsOpen("attendance-settings"); }}>
            <Settings size={15} /> Attendance Settings
          </button>
          <button className="hr-btn hr-btn-ghost" onClick={() => { setEditingDepartmentId(""); setDepartmentForm(emptyDepartment); setToolsOpen("department"); }}>
            <Building2 size={15} /> Add Department
          </button>
          <button className="hr-btn hr-btn-primary" onClick={() => { setEditingStaffId(""); setStaffForm({ ...emptyStaff, payrollCycleDay: cycleStartDay }); setToolsOpen("staff"); }}>
            <UserPlus size={15} /> + Add Staff
          </button>
        </div>
      </div>

      {/* Date bar */}
      <div className="hr-date-bar">
        <h2>{formatReadableDate(attendanceDate, { weekday: "short" })}</h2>
        <div className="hr-date-nav-row">
          <DateNavigator value={attendanceDate} onChange={setAttendanceDate} />
          <button className="hr-btn hr-btn-ghost" onClick={() => setAttendanceDate(localDate())}>Today</button>
        </div>
      </div>

      {/* Summary strip */}
      {renderSummaryStrip(attendanceDaySummary)}

      {/* Table */}
      <div className="hr-att-table-wrap">
        <table className="hr-att-table">
          <thead>
            <tr>
              <th>STAFF NAME</th>
              <th>MOBILE NUMBER</th>
              <th>LAST MONTH DUE</th>
              <th>BALANCE</th>
              <th>MARK ATTENDANCE</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {activeStaff.length === 0 ? (
              <tr><td colSpan={6} className="hr-empty-cell">Add staff to start attendance and payroll.</td></tr>
            ) : (
              attendanceRows.map((person) => {
                const dueSummary = staffDueSummaryByStaff.get(idOf(person));
                const scopedPayroll = payrollByStaff.get(idOf(person));
                const draft = attendanceDrafts[idOf(person)] || {};
                const balance = staffBalanceValue(person);
                const isSettled = balance <= 0;
                const BalIcon = isSettled ? ArrowDown : ArrowUp;
                const staffBasis = normalizeSalaryBasisValue(person.salaryBasis);
                const isHourly = staffBasis === "hourly";
                const isTimeBased = staffBasis === "hourly" || staffBasis === "daily";
                const selectedDate = attendanceDate || localDate();
                const duePayrollForSelectedDate = dueSummary?.payrolls?.find((item) => item.periodEnd === selectedDate)
                  || (scopedPayroll?.periodEnd === selectedDate ? scopedPayroll : null);
                const payroll = duePayrollForSelectedDate || dueSummary?.payroll || scopedPayroll;
                const selectedDateIsDue = isPayrollDueOnDate(person, selectedDate);
                const attendanceMarked = attendanceByStaff.has(idOf(person));
                const canShowPayrollDue = duePayrollForSelectedDate && duePayrollForSelectedDate.status !== "paid";
                const canGenerateDue = !duePayrollForSelectedDate && selectedDate <= localDate() && selectedDateIsDue && (staffBasis === "monthly" || attendanceMarked);
                return (
                  <tr key={idOf(person)} className="hr-att-row" onClick={() => openStaffDetail(person)}>
                    <td>
                      <span className="hr-staff-cell">
                        <strong>{person.name}</strong>
                        <small>{person.designation || person.department?.name || "Staff"}</small>
                      </span>
                    </td>
                    <td>{person.phone || "--"}</td>
                    <td>
                      {dueSummary ? (
                        <span className="hr-staff-cell">
                          <strong>{formatMoney(dueSummary.amount)}</strong>
                          {dueSummary.hours > 0 && <small>{dueSummary.hours} work hours</small>}
                          {dueSummary.count > 1 && <small>{dueSummary.count} unpaid payrolls</small>}
                        </span>
                      ) : payroll ? formatMoney(payroll.balanceDue ?? payroll.netPay) : "-"}
                    </td>
                    <td>
                      <span className={`hr-balance-chip ${isSettled ? "settled" : "due"}`}>
                        <BalIcon size={14} /> {formatMoney(balance)}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {isTimeBased ? (
                        <div className="hr-hourly-action">
                          <span className={`hr-pill ${isHourly ? "blue" : "amber"}`}>{isHourly ? "Hourly" : "Daily"}</span>
                          <button className="hr-btn hr-btn-ghost compact" onClick={() => openStaffDetail(person)}>
                            Add time
                          </button>
                        </div>
                      ) : (
                        <InlineAttendanceMark
                          status={draft.status}
                          onMark={(s) => quickMarkAttendance(person, s)}
                          onMenuAction={(action) => {
                            if (action === "overtime") {
                              setOvertimeModal({ staff: person, date: attendanceDate });
                              setOvertimeForm({ type: "hourly", hours: "00", mins: "00", rate: "1x", fixedAmount: "" });
                            } else {
                              quickMarkAttendance(person, action === "half_day" ? "half_day" : action === "paid_leave" ? "paid_leave" : action);
                            }
                          }}
                        />
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {canShowPayrollDue ? (
                        <button className="hr-btn hr-btn-outline-danger" onClick={() => makeStaffPayment(person)}>
                          Make Payment
                        </button>
                      ) : canGenerateDue ? (
                        <button className="hr-btn hr-btn-outline-danger" onClick={() => generateDuePayrollForStaff(person, selectedDate)} disabled={saving}>
                          Generate Payroll
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {activeStaff.length > 0 && (
          <tfoot className="hr-pending-footer">
            <tr>
                <td colSpan={2}><strong>Pending amount</strong></td>
                <td>
                  <strong className="hr-overdue">{formatMoney(payrollTotals.dues)} {payrollTotals.dues > 0 && <span className="hr-overdue-label">(overdue)</span>}</strong>
                </td>
                <td>
                  <span className={`hr-footer-balance ${summary?.dues > 0 ? "due" : "settled"}`}>
                    {summary?.dues > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {formatMoney(summary?.dues)}
                  </span>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );

  // Staff detail – mirrors screenshot 2
  const renderStaffDetail = () => {
    if (!selectedDetailStaff) return renderAttendanceWorkspace();
    return (
      <div className="hr-detail-layout">
        {/* Left rail */}
        <aside className="hr-detail-rail">
          <div className="hr-rail-head">
            <h2>Staff</h2>
            <button className="hr-btn hr-btn-primary compact" onClick={() => { setEditingStaffId(""); setStaffForm({ ...emptyStaff, payrollCycleDay: cycleStartDay }); setToolsOpen("staff"); }}>
              + Add Staff
            </button>
          </div>
          <div className="hr-rail-scroll">
            {filteredStaff.map((person) => {
              const balance = staffBalanceValue(person);
              const selected = idOf(person) === detailStaffId;
              const DirIcon = balance <= 0 ? ArrowDown : ArrowUp;
              return (
                <button key={idOf(person)} className={`hr-rail-item ${selected ? "selected" : ""}`} onClick={() => openStaffDetail(person, detailTab)}>
                  <span>
                    <strong>{person.name}</strong>
                    <small>{person.department?.name || person.phone || "Staff"}</small>
                  </span>
                  <b className={balance <= 0 ? "settled" : "due"}>
                    <DirIcon size={14} /> {formatMoney(balance)}
                  </b>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right detail */}
        <section className="hr-detail-main">
          <div className="hr-detail-topbar">
            <div className="hr-detail-title">
              <button className="hr-icon-btn" onClick={() => setDetailStaffId("")}><ChevronLeft size={20} /></button>
              <h1>{selectedDetailStaff.name}</h1>
            </div>
            <div className="hr-topbar-actions">
              <button className="hr-btn hr-btn-ghost" onClick={() => window.print()}>
                <Download size={15} /> Download Salary Slip
              </button>
              <button className="hr-btn hr-btn-primary" onClick={() => makeStaffPayment(selectedDetailStaff)} disabled={saving}>
                Make Payment
              </button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="hr-detail-tabs">
            {[{ id: "attendance", label: "Attendance" }, { id: "payroll", label: "Payroll" }, { id: "transactions", label: "Transactions" }, { id: "details", label: "Details" }].map((tab) => (
              <button key={tab.id} className={detailTab === tab.id ? "active" : ""} onClick={() => setDetailTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="hr-detail-body">
            {detailTab === "attendance" && renderDetailAttendanceTab()}
            {detailTab === "payroll" && renderDetailPayroll()}
            {detailTab === "transactions" && renderDetailTransactions()}
            {detailTab === "details" && renderDetailInfo()}
          </div>
        </section>
      </div>
    );
  };

  // Detail attendance tab – mirrors screenshot 2 rows
  const renderDetailAttendanceTab = () => {
    const isSingleDayStaff = usesSingleDayAttendance(selectedDetailStaff);
    const attendanceDates = isSingleDayStaff ? [detailDate] : datesInMonth(detailMonth).reverse();
    const isHourlyStaff = normalizeSalaryBasisValue(selectedDetailStaff?.salaryBasis) === "hourly";
    const expectedHours = Number(selectedDetailStaff?.expectedHoursPerDay || 8);
    return (
      <div>
        <div className="hr-detail-month-bar">
          <h3>{isSingleDayStaff ? formatReadableDate(detailDate, { weekday: "short" }) : formatMonthLabel(detailMonth)}</h3>
          {isSingleDayStaff ? (
            <div className="hr-date-nav-row">
              <DateNavigator value={detailDate} onChange={changeDetailDate} />
              <button className="hr-btn hr-btn-ghost compact" onClick={() => changeDetailDate(localDate())}>Today</button>
            </div>
          ) : (
            <div className="hr-month-nav">
              <button className="hr-icon-btn" onClick={() => setDetailMonth((m) => shiftMonth(m, -1))}><ChevronLeft size={18} /></button>
              <input type="month" value={detailMonth} onChange={(e) => setDetailMonth(e.target.value)} />
              <button className="hr-icon-btn" onClick={() => setDetailMonth((m) => shiftMonth(m, 1))}><ChevronRight size={18} /></button>
            </div>
          )}
        </div>
        {renderSummaryStrip(detailAttendanceSummary)}
        <div className="hr-detail-att-table-wrap">
          <table className="hr-detail-att-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>ATTENDANCE</th>
                <th>CHECK IN</th>
                <th>CHECK OUT</th>
                <th>WORK HOURS</th>
                <th>MENU</th>
                <th>SAVE</th>
              </tr>
            </thead>
            <tbody>
              {attendanceDates.map((date) => {
                const record = detailAttendanceByDate.get(date);
                const weeklyOff = selectedDetailStaff && isWeeklyOffForStaff(selectedDetailStaff, date);
                const rowShift = selectedDetailStaff?.department?.shift || {};
                const draft = {
                  status: record?.status || "",
                  checkIn: record?.checkIn || "",
                  checkOut: record?.checkOut || "",
                  workHours: record?.workHours ?? "",
                  overtimeHours: record?.overtimeHours ?? "",
                  fineHours: record?.fineHours ?? "",
                  note: record?.note || "",
                  ...(detailAttendanceDrafts[date] || {}),
                };
                const status = draft.status || "";
                const meta = ATTENDANCE_STATUS_META[status];
                const isWorkStatus = status === "present" || status === "half_day" || status === "short_leave";
                const canEditTime = !status || isWorkStatus;
                const calculatedHours = isHourlyStaff
                  ? (draft.checkIn && draft.checkOut ? calculateWorkHours(draft.checkIn, draft.checkOut) : Number(draft.workHours || 0))
                  : status === "present"
                    ? expectedHours
                    : status === "half_day"
                      ? expectedHours / 2
                      : status === "short_leave"
                        ? Math.max(0, expectedHours - 2)
                        : 0;
                const overtimeHours = Number(draft.overtimeHours || 0);
                const fineHours = Number(draft.fineHours || 0);
                const quickStatus = async (nextStatus) => {
                  const overrides = { status: nextStatus };
                  if (nextStatus === "present") {
                    const shiftCheckIn = draft.checkIn || rowShift.start || "09:00";
                    const shiftCheckOut = draft.checkOut || rowShift.end || "18:00";
                    overrides.checkIn = shiftCheckIn;
                    overrides.checkOut = shiftCheckOut;
                    if (isHourlyStaff) overrides.workHours = calculateWorkHours(shiftCheckIn, shiftCheckOut);
                  }
                  if (nextStatus === "absent") {
                    overrides.checkIn = "";
                    overrides.checkOut = "";
                    if (isHourlyStaff) overrides.workHours = 0;
                  }
                  setDetailAttendanceDrafts((prev) => ({ ...prev, [date]: { ...draft, ...overrides } }));
                  await saveDetailAttendanceDraft(selectedDetailStaff, date, overrides);
                };
                return (
                  <tr key={date}>
                    <td>
                      <strong>{formatReadableDate(date, { weekday: "short" })}</strong>
                    </td>
                    <td>
                      <div className="hr-detail-att-row">
                        <div className="hr-detail-quick-mark">
                          <button type="button" className={`hr-att-btn ${status === "present" ? "active" : ""}`} onClick={() => quickStatus("present")} title="Present">P</button>
                          <button type="button" className={`hr-att-btn ${status === "absent" ? "active-absent" : ""}`} onClick={() => quickStatus("absent")} title="Absent">A</button>
                        </div>
                        {meta && status !== "present" && status !== "absent" && <span className="hr-att-status-pill" style={{ background: pillBg(meta.tone), color: pillFg(meta.tone) }}>{meta.short}</span>}
                        {weeklyOff && !status && <span className="hr-att-status-pill wo">WO</span>}
                        {!status && !weeklyOff && <span className="hr-muted">Unmarked</span>}
                        {(overtimeHours > 0 || fineHours > 0) && (
                          <small className="hr-att-adjustment-note">
                            OT {overtimeHours}h / Fine {fineHours}h
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      <input
                        className="hr-mini-input hr-time-input"
                        type="time"
                        value={draft.checkIn || ""}
                        disabled={!canEditTime}
                        onChange={(e) => updateDetailAttendanceDraft(date, "checkIn", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="hr-mini-input hr-time-input"
                        type="time"
                        value={draft.checkOut || ""}
                        disabled={!canEditTime}
                        onChange={(e) => updateDetailAttendanceDraft(date, "checkOut", e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="hr-mini-input hr-hours-input"
                        type="number"
                        min="0"
                        step="0.25"
                        value={Number(calculatedHours || 0).toFixed(2)}
                        disabled={!isHourlyStaff || !canEditTime}
                        onChange={(e) => {
                          const nextHours = e.target.value;
                          const baseCheckIn = draft.checkIn || rowShift.start || "09:00";
                          const nextDraft = {
                            ...draft,
                            status: draft.status || "present",
                            checkIn: baseCheckIn,
                            workHours: nextHours,
                            checkOut: addHoursToTime(baseCheckIn, nextHours),
                          };
                          setDetailAttendanceDrafts((prev) => ({ ...prev, [date]: nextDraft }));
                        }}
                      />
                    </td>
                    <td>
                      <AttendanceRowMenu
                        open={openAttendanceMenu === date}
                        onToggle={() => setOpenAttendanceMenu((current) => current === date ? "" : date)}
                        onAction={(action) => applyDetailAttendanceMenuAction(selectedDetailStaff, date, action)}
                      />
                    </td>
                    <td>
                      <button type="button" className="hr-btn hr-btn-ghost compact" onClick={() => saveDetailAttendanceDraft(selectedDetailStaff, date)}>
                        Save
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {detailAttendanceLoading && <div className="hr-loading">Loading attendance...</div>}
      </div>
    );
  };

  const renderDetailPayroll = () => {
    if (!selectedDetailStaff) return null;
    const payroll = selectedPayroll;
    const salaryBasis = normalizeSalaryBasisValue(selectedDetailStaff.salaryBasis);
    return (
      <div className="hr-detail-payroll">
        <div className="hr-payroll-toolbar">
          <select value={payrollScope} onChange={(e) => changePayrollScope(e.target.value)}>
            {PAYROLL_SCOPE_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <DateNavigator value={payrollDueDate} onChange={changePayrollDate} onPrevious={() => stepPayrollDate(-1)} onNext={() => stepPayrollDate(1)} />
          <button className="hr-btn hr-btn-primary" onClick={() => generatePayrollForStaff(selectedDetailStaff)} disabled={saving}>
            <BadgeDollarSign size={15} /> Generate
          </button>
        </div>
        <span className="hr-cycle-caption">{payrollCycleCaption(payrollScope, payrollDueDate)}</span>
        {payroll ? (
          <div className="hr-payroll-detail-grid">
            <div className="hr-payroll-detail-card">
              <h4>Attendance</h4>
              <InfoRow label="Working days" value={salaryBasis === "hourly" ? `${payroll.totalWorkHours || 0} hours` : `${payroll.workingDays || 0} days`} />
              <InfoRow label="Present / Half / Absent" value={`${payroll.presentDays || 0} / ${payroll.halfDays || 0} / ${payroll.absentDays || 0}`} />
              <InfoRow label="Paid / Short leave" value={`${payroll.paidLeaveDays || 0} / ${payroll.shortLeaveDays || 0}`} />
            </div>
            <div className="hr-payroll-detail-card">
              <h4>Salary</h4>
              <InfoRow label="Gross" value={formatMoney(payroll.grossSalary)} />
              <InfoRow label="Daily rate" value={formatMoney(payroll.dailyRate || (payroll.workingDays ? Number(payroll.baseSalary || 0) / payroll.workingDays : 0))} />
              <InfoRow label="Hourly rate" value={formatMoney(payroll.hourlyRate)} />
              <InfoRow label="Deduction" value={formatMoney(payroll.attendanceDeduction)} />
              <InfoRow label="Overtime / Fine" value={`${formatMoney(payroll.overtimeAmount)} / ${formatMoney(payroll.fineAmount)}`} />
              <InfoRow label="Loan / advance deduction" value={formatMoney(payroll.loanDeduction)} />
              <InfoRow label="Net due" value={formatMoney(payroll.balanceDue ?? payroll.netPay)} strong />
            </div>
          </div>
        ) : (
          <div className="hr-empty-block">No payroll generated for this cycle.</div>
        )}
      </div>
    );
  };

  const renderDetailTransactions = () => (
    <div className="hr-detail-transactions">
      <div className="hr-mini-card">
        <div className="hr-sub-head-row">
          <h4>Transactions</h4>
          <button className="hr-btn hr-btn-primary compact" onClick={() => makeStaffPayment(selectedDetailStaff)} disabled={saving}>
            <CreditCard size={14} /> Make Payment
          </button>
        </div>
        <table className="hr-mini-table staff-tx-table">
          <thead><tr><th>Date</th><th>Bank</th><th>Type</th><th>Details</th><th>Amount</th></tr></thead>
          <tbody>
            {selectedStaffTransactions.length === 0 ? <tr><td colSpan={5} className="hr-empty-cell">No transactions yet.</td></tr> : selectedStaffTransactions.map((t) => {
              const period = transactionPeriodLabel(t);
              const breakdown = transactionBreakdownText(t);
              const emi = transactionLoanDeduction(t);
              const gross = transactionGrossSalary(t);
              const direction = staffTransactionDirection(t);
              return (
                <tr key={idOf(t) || `${idOf(t.bank)}-${t.paidAt}`}>
                  <td>{t.paidAt ? new Date(t.paidAt).toLocaleDateString() : "--"}</td>
                  <td>{t.bank?.name || "--"}</td>
                  <td>
                    <span className={`hr-pill ${direction === "in" ? "green" : "rose"}`}>{staffTransactionTitle(t)}</span>
                  </td>
                  <td>
                    {period && <small>{period}</small>}
                    {t.note && <small>{t.note}</small>}
                    {breakdown && <small>{breakdown}</small>}
                    {emi > 0 && gross > 0 && <small className="hr-emi-line">Deducted {formatMoney(emi)} from salary {formatMoney(gross)}</small>}
                    {["loan_out", "advance_out", "loan_repayment"].includes(t.type) && <small>Remaining {t.loan?.category === "advance" || t.type === "advance_out" ? "advance" : "loan"} {formatMoney(t.loanOutstandingAfter)}</small>}
                    {t.bankBalanceAfter > 0 && <small>Bank balance {formatMoney(t.bankBalanceAfter)}</small>}
                  </td>
                  <td>
                    <strong className={`hr-amount ${direction}`}>{direction === "in" ? "+" : "-"} {formatMoney(t.amount)}</strong>
                    {transactionNetPay(t) > 0 && <small>Net {formatMoney(transactionNetPay(t))}</small>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDetailInfo = () => {
    if (!selectedDetailStaff) return null;
    return (
      <div className="hr-two-col">
        <div className="hr-mini-card">
          <h4>Staff Details</h4>
          <InfoRow label="Employee code" value={selectedDetailStaff.employeeCode || "--"} />
          <InfoRow label="Mobile" value={selectedDetailStaff.phone || "--"} />
          <InfoRow label="Email" value={selectedDetailStaff.email || "--"} />
          <InfoRow label="Department" value={selectedDetailStaff.department?.name || "Unassigned"} />
          <InfoRow label="Designation" value={selectedDetailStaff.designation || "--"} />
          <InfoRow label="Joining date" value={selectedDetailStaff.joinDate ? formatReadableDate(selectedDetailStaff.joinDate.slice(0, 10)) : "--"} />
          <div className="hr-info-actions">
            <button className="hr-btn hr-btn-ghost" onClick={() => {
              setEditingStaffId(idOf(selectedDetailStaff));
              setStaffForm({ employeeCode: selectedDetailStaff.employeeCode || "", name: selectedDetailStaff.name || "", email: selectedDetailStaff.email || "", phone: selectedDetailStaff.phone || "", department: idOf(selectedDetailStaff.department), designation: selectedDetailStaff.designation || "", monthlySalary: selectedDetailStaff.monthlySalary || "", salaryBasis: normalizeSalaryBasisValue(selectedDetailStaff.salaryBasis), expectedHoursPerDay: selectedDetailStaff.expectedHoursPerDay || 8, payrollCycleDay: staffPayrollCycleDay(selectedDetailStaff), joinDate: selectedDetailStaff.joinDate ? selectedDetailStaff.joinDate.slice(0, 10) : localDate(), status: selectedDetailStaff.status || "active" });
              setToolsOpen("staff");
            }}><Pencil size={14} /> Edit Staff</button>
            {selectedDetailStaff.status === "active" && <button className="hr-btn hr-btn-ghost" onClick={() => archiveStaff(selectedDetailStaff)}><Archive size={14} /> Mark Inactive</button>}
          </div>
        </div>
        <div className="hr-mini-card">
          <h4>Salary Settings</h4>
          <InfoRow label="Salary basis" value={normalizeSalaryBasisValue(selectedDetailStaff.salaryBasis)} />
          <InfoRow label="Salary amount" value={formatMoney(selectedDetailStaff.monthlySalary)} />
          <InfoRow label="Daily hours" value={`${selectedDetailStaff.expectedHoursPerDay || 8}h`} />
          <InfoRow label="Status" value={selectedDetailStaff.status || "active"} strong />
        </div>
      </div>
    );
  };

  // Attendance Settings panel (no department form – only attendance auto-mark settings)
  const renderAttendanceSettings = () => (
    <div className="hr-tools-panel">
      <h3>Attendance Settings</h3>
      <p className="hr-muted">Auto-mark defaults for the selected date.</p>
      <div className="hr-form-grid-2">
        <label className="hr-check-label hr-span2">
          <input type="checkbox" checked={attendanceSettings.autoMark} onChange={(e) => setAttendanceSettings((p) => ({ ...p, autoMark: e.target.checked }))} />
          Mark attendance automatically
        </label>
        <Field label="Default Mark">
          <select value={attendanceSettings.defaultStatus} onChange={(e) => setAttendanceSettings((p) => ({ ...p, defaultStatus: e.target.value }))}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
            <option value="half_day">Half Day</option>
            <option value="paid_leave">Paid Leave</option>
          </select>
        </Field>
        <Field label="Check In">
          <input type="time" value={attendanceSettings.checkIn} onChange={(e) => setAttendanceSettings((p) => ({ ...p, checkIn: e.target.value }))} />
        </Field>
        <Field label="Check Out">
          <input type="time" value={attendanceSettings.checkOut} onChange={(e) => setAttendanceSettings((p) => ({ ...p, checkOut: e.target.value }))} />
        </Field>
      </div>
      <button className="hr-btn hr-btn-primary mt12" onClick={autoMarkUnmarkedAttendance} disabled={saving}>
        <CheckCircle2 size={14} /> Mark Unmarked Staff
      </button>
    </div>
  );

  // Department form + list
  const renderDepartmentPanel = () => (
    <div className="hr-tools-panel">
      <h3>{editingDepartmentId ? "Edit Department" : "Add Department"}</h3>
      <form className="hr-form-grid-2" onSubmit={saveDepartment}>
        <Field label="Name"><input value={departmentForm.name} onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })} placeholder="Sales" /></Field>
        <Field label="Description"><input value={departmentForm.description} onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })} placeholder="Optional" /></Field>
        <Field label="Shift Start"><input type="time" value={departmentForm.shift.start} onChange={(e) => setDepartmentForm({ ...departmentForm, shift: { ...departmentForm.shift, start: e.target.value } })} /></Field>
        <Field label="Shift End"><input type="time" value={departmentForm.shift.end} onChange={(e) => setDepartmentForm({ ...departmentForm, shift: { ...departmentForm.shift, end: e.target.value } })} /></Field>
        <Field label="Break (mins)"><input type="number" min="0" value={departmentForm.shift.breakMinutes} onChange={(e) => setDepartmentForm({ ...departmentForm, shift: { ...departmentForm.shift, breakMinutes: e.target.value } })} /></Field>
        <Field label="Paid Leave / Cycle"><input type="number" min="0" value={departmentForm.leavePolicy?.paidLeaves ?? 0} onChange={(e) => setDepartmentForm({ ...departmentForm, leavePolicy: { ...(departmentForm.leavePolicy || {}), paidLeaves: e.target.value } })} /></Field>
        <Field label="Short Leave / Cycle"><input type="number" min="0" value={departmentForm.leavePolicy?.shortLeaves ?? 0} onChange={(e) => setDepartmentForm({ ...departmentForm, leavePolicy: { ...(departmentForm.leavePolicy || {}), shortLeaves: e.target.value } })} /></Field>
        <div className="hr-span2">
          <label className="hr-field-label">Weekly Off Days</label>
          <div className="hr-day-checks">
            {DAY_OPTIONS.map((day) => {
              const checked = departmentForm.weeklyOffDays.map(Number).includes(day.id);
              return (
                <label key={day.id} className={`hr-day-check ${checked ? "active" : ""}`}>
                  <input type="checkbox" checked={checked} onChange={() => {
                    const current = departmentForm.weeklyOffDays.map(Number);
                    const next = checked ? current.filter((x) => x !== day.id) : [...current, day.id];
                    setDepartmentForm({ ...departmentForm, weeklyOffDays: next });
                  }} />
                  {day.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="hr-span2 hr-form-actions-row">
          {editingDepartmentId && <button type="button" className="hr-btn hr-btn-ghost" onClick={() => { setEditingDepartmentId(""); setDepartmentForm(emptyDepartment); }}>Cancel</button>}
          <button type="submit" className="hr-btn hr-btn-primary" disabled={saving}><Save size={14} /> {editingDepartmentId ? "Update" : "Add Department"}</button>
        </div>
      </form>

      {/* Departments list below form */}
      <div className="hr-dept-list">
        {departments.length === 0 ? <p className="hr-muted">No departments yet.</p> : departments.map((dept) => (
          <div key={idOf(dept)} className="hr-dept-card">
            <div className="hr-dept-card-head">
              <div>
                <strong>{dept.name}</strong>
                <small>{dept.description || "No description"}</small>
              </div>
              <div className="hr-row-actions">
                <button className="hr-icon-btn" onClick={() => { setEditingDepartmentId(idOf(dept)); setDepartmentForm({ name: dept.name || "", description: dept.description || "", weeklyOffDays: dept.weeklyOffDays || [], shift: { name: dept.shift?.name || "General", start: dept.shift?.start || "09:00", end: dept.shift?.end || "18:00", breakMinutes: dept.shift?.breakMinutes ?? 60 }, leavePolicy: { paidLeaves: dept.leavePolicy?.paidLeaves ?? 0, shortLeaves: dept.leavePolicy?.shortLeaves ?? 0 } }); }}><Pencil size={13} /></button>
                <button className="hr-icon-btn danger" onClick={() => deleteDepartment(dept)}><Trash2 size={13} /></button>
              </div>
            </div>
            <div className="hr-dept-meta">
              <span>Off: {dayLabels(dept.weeklyOffDays)}</span>
              <span>Shift: {shiftLabel(dept.shift)}</span>
              <span>Short leave: {dept.leavePolicy?.shortLeaves ?? 0}/cycle</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Add staff form
  const renderStaffForm = () => (
    <div className="hr-tools-panel">
      <h3>{editingStaffId ? "Edit Staff" : "Add Staff"}</h3>
      <form className="hr-form-grid-3" onSubmit={saveStaff}>
        <Field label="Employee Code"><input value={staffForm.employeeCode} onChange={(e) => setStaffForm({ ...staffForm, employeeCode: e.target.value })} placeholder="EMP-001" /></Field>
        <Field label="Name"><input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} placeholder="Full name" /></Field>
        <Field label="Phone"><input value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="Mobile" /></Field>
        <Field label="Email"><input type="email" value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} placeholder="email@example.com" /></Field>
        <Field label="Department">
          <select value={staffForm.department} onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}>
            <option value="">Select department</option>
            {departments.map((d) => <option key={idOf(d)} value={idOf(d)}>{d.name} ({shiftLabel(d.shift)})</option>)}
          </select>
        </Field>
        <Field label="Designation"><input value={staffForm.designation} onChange={(e) => setStaffForm({ ...staffForm, designation: e.target.value })} placeholder="Support Executive" /></Field>
        {selectedStaffFormDepartment && (
          <div className="hr-shift-preview">
            <span>Shift</span>
            <strong>{shiftLabel(selectedStaffFormDepartment.shift)}</strong>
            <small>Weekly off: {dayLabels(selectedStaffFormDepartment.weeklyOffDays)} | Short leave: {selectedStaffFormDepartment.leavePolicy?.shortLeaves ?? 0}/cycle</small>
          </div>
        )}
        <Field label="Salary Basis">
          <select value={staffForm.salaryBasis} onChange={(e) => setStaffForm({ ...staffForm, salaryBasis: e.target.value, expectedHoursPerDay: staffForm.expectedHoursPerDay || 8 })}>
            <option value="monthly">Monthly</option>
            <option value="daily">Daily</option>
            <option value="hourly">Hourly</option>
          </select>
        </Field>
        {normalizeSalaryBasisValue(staffForm.salaryBasis) === "monthly" ? (
          <Field label="Payroll Cycle">
            <select value={staffForm.payrollCycleDay} onChange={(e) => setStaffForm({ ...staffForm, payrollCycleDay: e.target.value })}>
              {PAYROLL_CYCLE_OPTIONS.map((day) => <option key={day} value={day}>{day} to {day}</option>)}
            </select>
          </Field>
        ) : (
          <div className="hr-shift-preview">
            <span>Payroll cycle</span>
            <strong>End of day</strong>
            <small>Due appears after attendance is marked for that day.</small>
          </div>
        )}
        <Field label={normalizeSalaryBasisValue(staffForm.salaryBasis) === "hourly" ? "Hourly Rate" : normalizeSalaryBasisValue(staffForm.salaryBasis) === "daily" ? "Daily Salary" : "Monthly Salary"}>
          <input type="number" min="0" value={staffForm.monthlySalary} onChange={(e) => setStaffForm({ ...staffForm, monthlySalary: e.target.value })} placeholder="30000" />
        </Field>
        <Field label="Daily Work Hours"><input type="number" min="0" step="0.5" value={staffForm.expectedHoursPerDay} onChange={(e) => setStaffForm({ ...staffForm, expectedHoursPerDay: e.target.value })} /></Field>
        <div className="hr-salary-preview hr-span2">
          <span>Salary preview</span>
          <div>
            {staffSalaryPreview.map((item) => (
              <strong key={item.label}>{item.label}: {item.plain ? item.value : formatMoney(item.value)}</strong>
            ))}
          </div>
        </div>
        <Field label="Joining Date">
          <input type="date" value={staffForm.joinDate?.slice(0, 10)} onChange={(e) => setStaffForm({ ...staffForm, joinDate: e.target.value })} />
        </Field>
        <Field label="Status">
          <select value={staffForm.status} onChange={(e) => setStaffForm({ ...staffForm, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="resigned">Resigned</option>
          </select>
        </Field>
        <div className="hr-span2 hr-form-actions-row">
          {editingStaffId && <button type="button" className="hr-btn hr-btn-ghost" onClick={() => { setEditingStaffId(""); setStaffForm({ ...emptyStaff, payrollCycleDay: cycleStartDay }); }}>Cancel</button>}
          <button type="submit" className="hr-btn hr-btn-primary" disabled={saving}><Save size={14} /> {editingStaffId ? "Update Staff" : "Add Staff"}</button>
        </div>
      </form>
    </div>
  );

  const renderBanksLoans = () => (
    <section className="hr-main-section">
      <div className="hr-section-topbar">
        <h1>Banks &amp; Loans</h1>
        <div className="hr-topbar-actions">
          <button className="hr-btn hr-btn-ghost" onClick={() => setToolsOpen("bank")}><Plus size={14} /> Add Bank</button>
          <button className="hr-btn hr-btn-ghost" onClick={() => setToolsOpen("view-loans")}><Wallet size={14} /> View Loans</button>
          <button className="hr-btn hr-btn-primary" onClick={() => openBankPayment(selectedBankAccount)} disabled={banks.length === 0}><CreditCard size={14} /> Make Payment</button>
          <button className="hr-btn hr-btn-ghost" onClick={loadAll}><RefreshCcw size={14} /></button>
        </div>
      </div>
      <div className="hr-cash-bank-layout">
        <aside className="hr-bank-ledger-rail">
          <div className="hr-ledger-balance">
            <span>Total Balance:</span>
            <strong>{formatMoney(summary?.bankBalance)}</strong>
          </div>
          <div className="hr-ledger-balance subtle">
            <span>Loan / Advance Outstanding:</span>
            <strong>{formatMoney(summary?.loanOutstanding)}</strong>
          </div>
          <div className="hr-ledger-section-title">
            <span>Bank Accounts</span>
            <button className="hr-link-btn" onClick={() => setToolsOpen("bank")}>+ Add New Bank</button>
          </div>
          <div className="hr-bank-ledger-list">
            {banks.length === 0 ? (
              <div className="hr-empty-block compact">No banks added yet.</div>
            ) : banks.map((bank) => {
              const selected = idOf(bank) === idOf(selectedBankAccount);
              return (
                <button key={idOf(bank)} className={`hr-bank-ledger-item ${selected ? "selected" : ""}`} onClick={() => setSelectedBank(bank)}>
                  <span className="hr-bank-icon"><Landmark size={16} /></span>
                  <span>
                    <strong>{bank.name}</strong>
                    <small>{[bank.accountName, bank.accountNumber].filter(Boolean).join(" | ") || "Payroll bank"}</small>
                  </span>
                  <b>{formatMoney(bank.balance)}</b>
                </button>
              );
            })}
          </div>
        </aside>
        <div className="hr-bank-ledger-detail">
          <div className="hr-bank-detail-tabs">
            <button className="active">All Transactions</button>
            <span className="hr-pill slate">{filteredBankTransactions.length} total</span>
          </div>
          {selectedBankAccount ? (
            <>
              <div className="hr-bank-account-summary">
                <div>
                  <span>Account Name</span>
                  <strong>{selectedBankAccount.name}</strong>
                  <small>{[selectedBankAccount.accountName, selectedBankAccount.accountNumber].filter(Boolean).join(" | ") || "Payroll bank"}</small>
                </div>
                <div>
                  <span>Balance</span>
                  <strong>{formatMoney(selectedBankAccount.balance)}</strong>
                </div>
                <div className="hr-bank-account-actions">
                  <button className="hr-btn hr-btn-ghost" onClick={() => openAddBankMoney(selectedBankAccount)}><Plus size={14} /> Add Money</button>
                  <button className="hr-btn hr-btn-ghost" onClick={() => openBankPayment(selectedBankAccount)}><CreditCard size={14} /> Make Payment</button>
                </div>
              </div>
              <div className="hr-bank-filter-bar">
                <div className="hr-bank-filter-controls">
                  <select value={bankTxnFilter.mode} onChange={(e) => setBankTxnFilter((p) => ({ ...p, mode: e.target.value }))}>
                    <option value="all">All dates</option>
                    <option value="date">Filter by date</option>
                    <option value="month">Filter by month</option>
                  </select>
                  {bankTxnFilter.mode === "date" && (
                    <input type="date" value={bankTxnFilter.date} onChange={(e) => setBankTxnFilter((p) => ({ ...p, date: e.target.value }))} />
                  )}
                  {bankTxnFilter.mode === "month" && (
                    <input type="month" value={bankTxnFilter.month} onChange={(e) => setBankTxnFilter((p) => ({ ...p, month: e.target.value }))} />
                  )}
                </div>
                <div className="hr-bank-filter-totals">
                  <span className="in">In {formatMoney(bankTransactionTotals.in)}</span>
                  <span className="out">Out {formatMoney(bankTransactionTotals.out)}</span>
                </div>
              </div>
              <div className="hr-att-table-wrap hr-finance-table-wrap hr-bank-ledger-table">
                <table className="hr-att-table bank-tx-table">
                  <thead><tr><th>Date</th><th>Party</th><th>Details</th><th>In</th><th>Out</th></tr></thead>
                  <tbody>
                    {filteredBankTransactions.length === 0 ? <tr><td colSpan={5} className="hr-empty-cell">No transactions for this filter.</td></tr> : filteredBankTransactions.map((item) => (
                      <tr key={item.id}>
                        <td>{item.date ? new Date(item.date).toLocaleDateString() : "--"}</td>
                        <td><strong>{item.name}</strong>{item.periodLabel && <small>{item.periodLabel}</small>}</td>
                        <td>
                          <strong>{item.title}</strong>
                          {item.note && <small>{item.note}</small>}
                          {item.breakdown && <small>{item.breakdown}</small>}
                          {item.loanDeduction > 0 && <small className="hr-emi-line">Deducted {formatMoney(item.loanDeduction)}</small>}
                          {item.hasLoanBalance && <small>Remaining {item.loanCategory === "advance" ? "advance" : "loan"} {formatMoney(item.loanOutstandingAfter)}</small>}
                        </td>
                        <td>
                          {item.direction === "in" ? <strong className="hr-amount in">{formatMoney(item.amount)}</strong> : <span className="hr-muted">--</span>}
                          {item.direction === "in" && item.bankBalanceAfter > 0 && <small>Balance {formatMoney(item.bankBalanceAfter)}</small>}
                        </td>
                        <td>
                          {item.direction === "out" ? <strong className="hr-amount out">{formatMoney(item.amount)}</strong> : <span className="hr-muted">--</span>}
                          {item.direction === "out" && item.bankBalanceAfter > 0 && <small>Balance {formatMoney(item.bankBalanceAfter)}</small>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="hr-empty-block">Add a bank account to start recording payments.</div>
          )}
        </div>
      </div>
    </section>
  );

  const renderOverview = () => (
    <section className="hr-main-section">
      <div className="hr-section-topbar">
        <h1>HR Overview</h1>
        <div className="hr-topbar-actions">
          <button className="hr-btn hr-btn-ghost" onClick={() => openAddBankMoney(selectedBankAccount)} disabled={banks.length === 0}><Plus size={14} /> Add Money</button>
          <button className="hr-btn hr-btn-primary" onClick={() => openBankPayment(selectedBankAccount)} disabled={banks.length === 0}><CreditCard size={14} /> Make Payment</button>
          <button className="hr-btn hr-btn-ghost" onClick={loadAll}><RefreshCcw size={14} /> Refresh</button>
        </div>
      </div>
      <div className="hr-metrics-row">
        {[
          { icon: Users, label: "Active Staff", value: summary?.activeStaffCount || 0, tone: "blue" },
          { icon: Landmark, label: "Bank Balance", value: formatMoney(summary?.bankBalance), tone: "green" },
          { icon: ArrowDown, label: "Money In", value: formatMoney(allBankTransactionTotals.in), tone: "blue" },
          { icon: ArrowUp, label: "Money Out", value: formatMoney(allBankTransactionTotals.out), tone: "rose" },
          { icon: DollarSign, label: "Salary Dues", value: formatMoney(summary?.dues), tone: "amber" },
          { icon: Wallet, label: "Loan / Advance", value: formatMoney(summary?.loanOutstanding), tone: "violet" },
        ].map((m) => (
          <div key={m.label} className={`hr-metric-card ${m.tone}`}>
            <m.icon size={22} />
            <div><span>{m.label}</span><strong>{m.value}</strong></div>
          </div>
        ))}
      </div>
      <div className="hr-overview-grid mt12">
        <div className="hr-mini-card">
          <h4>Payroll</h4>
          <InfoRow label="Cycle" value={payrollScopeLabel(payrollScope)} />
          <InfoRow label="Due date" value={payrollDueDate} />
          <InfoRow label="Gross" value={formatMoney(payrollTotals.gross)} />
          <InfoRow label="Attendance deduction" value={formatMoney(payrollTotals.deductions)} />
          <InfoRow label="Loan / advance deduction" value={formatMoney(payrollTotals.loan)} />
          <InfoRow label="Paid" value={formatMoney(payrollTotals.paid)} />
          <InfoRow label="Net dues" value={formatMoney(payrollTotals.dues)} strong />
        </div>
        <div className="hr-mini-card">
          <h4>Loan / Advance</h4>
          <InfoRow label="Active records" value={repaymentBreakdown.count} />
          <InfoRow label="Loan outstanding" value={formatMoney(repaymentBreakdown.loan)} />
          <InfoRow label="Advance outstanding" value={formatMoney(repaymentBreakdown.advance)} />
          <InfoRow label="Next salary deductions" value={formatMoney(repaymentBreakdown.deduction)} strong />
        </div>
        <div className="hr-mini-card">
          <h4>Bank Accounts</h4>
          {banks.length === 0 ? <p className="hr-muted">No banks added yet.</p> : banks.slice(0, 5).map((bank) => (
            <InfoRow key={idOf(bank)} label={bank.name} value={formatMoney(bank.balance)} strong={idOf(bank) === idOf(selectedBankAccount)} />
          ))}
        </div>
        <div className="hr-mini-card">
          <h4>Operations</h4>
          <InfoRow label="Departments" value={summary?.departmentCount || 0} />
          <InfoRow label="Pending payrolls" value={summary?.pendingPayrolls || 0} />
          <InfoRow label="Transactions" value={bankTransactionRows.length} />
          <InfoRow label="Staff payable balance" value={formatMoney(summary?.dues)} strong />
        </div>
        <div className="hr-mini-card hr-overview-wide">
          <div className="hr-sub-head-row">
            <h4>Recent Transactions</h4>
            <span className="hr-pill slate">{bankTransactionRows.length} total</span>
          </div>
          <table className="hr-mini-table overview-tx-table">
            <thead><tr><th>Date</th><th>Party</th><th>Details</th><th>Bank</th><th>In</th><th>Out</th></tr></thead>
            <tbody>
              {recentBankTransactions.length === 0 ? <tr><td colSpan={6} className="hr-empty-cell">No transactions yet.</td></tr> : recentBankTransactions.map((item) => (
                <tr key={item.id}>
                  <td>{item.date ? new Date(item.date).toLocaleDateString() : "--"}</td>
                  <td><strong>{item.name}</strong>{item.periodLabel && <small>{item.periodLabel}</small>}</td>
                  <td>
                    <strong>{item.title}</strong>
                    {item.note && <small>{item.note}</small>}
                    {item.breakdown && <small>{item.breakdown}</small>}
                    {item.hasLoanBalance && <small>Remaining {item.loanCategory === "advance" ? "advance" : "loan"} {formatMoney(item.loanOutstandingAfter)}</small>}
                  </td>
                  <td>{item.source}</td>
                  <td>{item.direction === "in" ? <strong className="hr-amount in">{formatMoney(item.amount)}</strong> : <span className="hr-muted">--</span>}</td>
                  <td>{item.direction === "out" ? <strong className="hr-amount out">{formatMoney(item.amount)}</strong> : <span className="hr-muted">--</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="hr-mini-card">
          <h4>Departments</h4>
          {departments.length === 0 ? <p className="hr-muted">No departments yet.</p> : departments.slice(0, 5).map((d) => (
            <InfoRow key={idOf(d)} label={d.name} value={`${d.shift?.start || "--"} – ${d.shift?.end || "--"} | Off: ${dayLabels(d.weeklyOffDays)}`} />
          ))}
        </div>
      </div>
    </section>
  );

  // ─── MODALS ───────────────────────────────────────────────────────────────────

  const renderToolsModal = () => {
    if (!toolsOpen) return null;
    const titles = { staff: editingStaffId ? "Edit Staff" : "Add Staff", "attendance-settings": "Attendance Settings", department: editingDepartmentId ? "Edit Department" : "Add Department", bank: "Add Bank", loan: "Add Loan", "view-loans": "Loans" };
    const content = {
      staff: renderStaffForm(),
      "attendance-settings": renderAttendanceSettings(),
      department: renderDepartmentPanel(),
      bank: (
        <div className="hr-tools-panel">
          <h3>Add Bank</h3>
          <form className="hr-form-grid-2" onSubmit={saveBank}>
            <Field label="Bank Name"><input value={bankForm.name} onChange={(e) => setBankForm({ ...bankForm, name: e.target.value })} placeholder="HDFC Payroll" /></Field>
            <Field label="Account Name"><input value={bankForm.accountName} onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })} /></Field>
            <Field label="Account Number"><input value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} /></Field>
            <Field label="Opening Balance"><input type="number" min="0" value={bankForm.balance} onChange={(e) => setBankForm({ ...bankForm, balance: e.target.value })} /></Field>
            <div className="hr-span2 hr-form-actions-row"><button type="submit" className="hr-btn hr-btn-primary" disabled={saving}><Plus size={14} /> Add Bank</button></div>
          </form>
        </div>
      ),
      "view-loans": (
        <div className="hr-tools-panel">
          <div className="hr-sub-head-row">
            <div>
              <h3>Loans</h3>
              <p className="hr-muted">All staff loans and outstanding balances.</p>
            </div>
            <button className="hr-btn hr-btn-primary compact" onClick={() => { setToolsOpen(""); openBankPayment(selectedBankAccount); }} disabled={banks.length === 0}><CreditCard size={14} /> Make Payment</button>
          </div>
          <div className="hr-loans-list">
            {loans.length === 0 ? (
              <div className="hr-empty-block">No loans yet.</div>
            ) : loans.map((loan) => (
              <div key={idOf(loan)} className="hr-loan-card">
                <div>
                  <strong>{loan.staff?.name || "Staff"}</strong>
                  <small>{loan.staff?.department?.name || loan.staff?.designation || "Staff loan"}</small>
                </div>
                <div><span>{repaymentKindLabel(loan)}</span><strong>{formatMoney(loan.amount)}</strong></div>
                <div><span>Deduction</span><strong>{formatMoney(loan.emi)}</strong></div>
                <div><span>Outstanding</span><strong>{formatMoney(loan.outstanding)}</strong></div>
                <div className="hr-loan-card-actions">
                  <span className={`hr-pill ${loan.status === "active" ? "amber" : "green"}`}>{loan.status}</span>
                  {loan.status === "active" && <button className="hr-btn hr-btn-ghost compact" onClick={() => closeLoan(loan)}>Close</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      loan: (
        <div className="hr-tools-panel">
          <h3>Add Loan</h3>
          <form className="hr-form-grid-2" onSubmit={saveLoan}>
            <Field label="Staff">
              <select value={loanForm.staff} onChange={(e) => setLoanForm({ ...loanForm, staff: e.target.value })}>
                <option value="">Select staff</option>
                {activeStaff.map((p) => <option key={idOf(p)} value={idOf(p)}>{staffLabel(p)}</option>)}
              </select>
            </Field>
            <Field label="Loan Amount"><input type="number" min="0" value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value })} /></Field>
            <Field label="Monthly EMI"><input type="number" min="0" value={loanForm.emi} onChange={(e) => setLoanForm({ ...loanForm, emi: e.target.value })} /></Field>
            <Field label="Issue Date"><input type="date" value={loanForm.issueDate} onChange={(e) => setLoanForm({ ...loanForm, issueDate: e.target.value })} /></Field>
            <Field label="Note"><input value={loanForm.note} onChange={(e) => setLoanForm({ ...loanForm, note: e.target.value })} placeholder="Optional" /></Field>
            <div className="hr-span2 hr-form-actions-row"><button type="submit" className="hr-btn hr-btn-primary" disabled={saving}><Plus size={14} /> Add Loan</button></div>
          </form>
        </div>
      ),
    }[toolsOpen];

    return (
      <div className="hr-modal-backdrop" onClick={() => setToolsOpen("")}>
        <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
          <div className="hr-modal-header">
            <h3>{titles[toolsOpen] || "HR"}</h3>
            <button className="hr-icon-btn" onClick={() => setToolsOpen("")}><X size={16} /></button>
          </div>
          {content}
        </div>
      </div>
    );
  };

  // Add Overtime modal – mirrors screenshot 3
  const renderOvertimeModal = () => {
    if (!overtimeModal) return null;
    const { staff: person, date } = overtimeModal;
    const hourlyRate = estimateHourlyRateForStaff(person, date);
    const multipliers = { "1x": 1, "1.5x": 1.5, "2x": 2 };
    const mult = multipliers[overtimeForm.rate] || 1;
    const totalHours = Number(overtimeForm.hours || 0) + Number(overtimeForm.mins || 0) / 60;
    const ratePerHr = hourlyRate * mult;
    const totalAmount = totalHours * ratePerHr;

    return (
      <div className="hr-modal-backdrop" onClick={() => setOvertimeModal(null)}>
        <div className="hr-modal ot-modal" onClick={(e) => e.stopPropagation()}>
          <div className="hr-modal-header">
            <h3>Add Overtime</h3>
            <button className="hr-icon-btn" onClick={() => setOvertimeModal(null)}><X size={16} /></button>
          </div>
          <div className="ot-info-row">
            <div><span className="hr-muted">Staff name</span><strong>{person?.name}</strong></div>
            <div><span className="hr-muted">Date</span><strong>{formatReadableDate(date, { day: "numeric", month: "short", year: "numeric" })}</strong></div>
          </div>
          <div className="ot-type-row">
            <span className="hr-muted">Overtime Type</span>
            <label className="ot-radio"><input type="radio" name="ot_type" checked={overtimeForm.type === "hourly"} onChange={() => setOvertimeForm((p) => ({ ...p, type: "hourly" }))} /> Hourly rate</label>
          </div>
          <div className="ot-hours-row">
              <div>
                <label className="hr-muted-label">Number of hours <span className="hr-required">*</span></label>
                <div className="ot-time-input">
                  <input type="number" min="0" max="23" value={overtimeForm.hours} onChange={(e) => setOvertimeForm((p) => ({ ...p, hours: e.target.value }))} className="ot-hrs-input" /> Hrs
                  <span className="ot-colon">:</span>
                  <select value={overtimeForm.mins} onChange={(e) => setOvertimeForm((p) => ({ ...p, mins: e.target.value }))}>
                    {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select> Min
                </div>
              </div>
              <div>
                <label className="hr-muted-label">Overtime rate <span className="hr-required">*</span></label>
                <div className="ot-rate-input">
                  <select value={overtimeForm.rate} onChange={(e) => setOvertimeForm((p) => ({ ...p, rate: e.target.value }))}>
                    <option value="1x">1x Salary</option>
                    <option value="1.5x">1.5x Salary</option>
                    <option value="2x">2x Salary</option>
                  </select>
                  <span className="ot-rate-value">₹ {ratePerHr.toFixed(0)} /Hr</span>
                </div>
              </div>
          </div>
          <div className="ot-total">
            <span className="hr-muted">Total amount</span>
            <strong>{`${String(overtimeForm.hours).padStart(2, "0")}:${String(overtimeForm.mins).padStart(2, "0")} × ₹${ratePerHr.toFixed(0)} = ${totalAmount.toFixed(0)}`}</strong>
          </div>
          <div className="hr-modal-actions">
            <button className="hr-btn hr-btn-ghost" onClick={() => setOvertimeModal(null)}>Cancel</button>
            <button className="hr-btn hr-btn-primary" onClick={saveOvertime} disabled={saving}>Save</button>
          </div>
        </div>
      </div>
    );
  };

  const renderFineModal = () => {
    if (!fineModal) return null;
    const { staff: person, date } = fineModal;
    const hourlyRate = estimateHourlyRateForStaff(person, date);
    const hours = Number(fineForm.hours || 0);
    const amount = hours * hourlyRate;

    return (
      <div className="hr-modal-backdrop" onClick={() => setFineModal(null)}>
        <div className="hr-modal ot-modal" onClick={(e) => e.stopPropagation()}>
          <div className="hr-modal-header">
            <h3>Add Fine</h3>
            <button className="hr-icon-btn" onClick={() => setFineModal(null)}><X size={16} /></button>
          </div>
          <div className="ot-info-row">
            <div><span className="hr-muted">Staff name</span><strong>{person?.name}</strong></div>
            <div><span className="hr-muted">Date</span><strong>{formatReadableDate(date, { day: "numeric", month: "short", year: "numeric" })}</strong></div>
          </div>
          <div className="hr-form-grid-2 mt12">
            <Field label="Fine Hours">
              <input type="number" min="0" step="0.25" value={fineForm.hours} onChange={(e) => setFineForm((p) => ({ ...p, hours: e.target.value }))} />
            </Field>
            <Field label="Estimated Amount">
              <input value={formatMoney(amount)} readOnly />
            </Field>
            <Field label="Note" className="hr-span2">
              <input value={fineForm.note} onChange={(e) => setFineForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional" />
            </Field>
          </div>
          <div className="hr-modal-actions mt12">
            <button className="hr-btn hr-btn-ghost" onClick={() => setFineModal(null)}>Cancel</button>
            <button className="hr-btn hr-btn-primary" onClick={saveFine} disabled={saving}>Save</button>
          </div>
        </div>
      </div>
    );
  };

  const renderClearDueModal = () => {
    if (!clearDuePayroll) return null;
    const salaryBasis = normalizeSalaryBasisValue(clearDuePayroll.salaryBasis || clearDuePayroll.staff?.salaryBasis);
    const hourlyRate = Number(clearDuePayroll.hourlyRate || 0);
    const overtimeAmount = Number(clearDuePayroll.overtimeAmount || 0);
    const fineAmount = Number(clearDuePayroll.fineAmount || 0);
    const currentDue = Number(clearDuePayroll.balanceDue ?? clearDuePayroll.netPay ?? 0);

    return (
      <div className="hr-modal-backdrop" onClick={() => setClearDuePayroll(null)}>
        <div className="hr-modal" onClick={(e) => e.stopPropagation()}>
          <div className="hr-modal-header">
            <h3>Clear Due</h3>
            <button className="hr-icon-btn" onClick={() => setClearDuePayroll(null)}><X size={16} /></button>
          </div>
          <p className="hr-muted">{clearDuePayroll.staff?.name} | {clearDuePayroll.periodLabel || clearDuePayroll.periodEnd}</p>
          <div className="hr-two-col mt12">
            <div className="hr-mini-card">
              <h4>Salary Calculation</h4>
              <InfoRow label="Base salary" value={formatMoney(clearDuePayroll.baseSalary)} />
              <InfoRow label={salaryBasis === "hourly" ? "Work hours" : "Working days"} value={salaryBasis === "hourly" ? `${clearDuePayroll.totalWorkHours || 0} hours` : `${clearDuePayroll.workingDays || 0} days`} />
              <InfoRow label="Weekly off days" value={`${clearDuePayroll.paidOffDays || 0} days`} />
              <InfoRow label="Daily rate" value={formatMoney(clearDuePayroll.dailyRate || (clearDuePayroll.workingDays ? Number(clearDuePayroll.baseSalary || 0) / clearDuePayroll.workingDays : 0))} />
              <InfoRow label="Hourly rate" value={formatMoney(hourlyRate)} />
              <InfoRow label="Present / Half / Absent" value={`${clearDuePayroll.presentDays || 0} / ${clearDuePayroll.halfDays || 0} / ${clearDuePayroll.absentDays || 0}`} />
              <InfoRow label="Paid / Short leave" value={`${clearDuePayroll.paidLeaveDays || 0} / ${clearDuePayroll.shortLeaveDays || 0}`} />
              <InfoRow label="Unpaid leave" value={`${clearDuePayroll.unpaidLeaveDays || 0} days`} />
              <InfoRow label="Gross salary" value={formatMoney(clearDuePayroll.grossSalary)} />
              <InfoRow label="Attendance deduction" value={formatMoney(clearDuePayroll.attendanceDeduction)} />
              <InfoRow label="Loan EMI" value={formatMoney(clearDuePayroll.loanDeduction)} />
              <InfoRow label="Overtime amount" value={formatMoney(overtimeAmount)} />
              <InfoRow label="Fine amount" value={formatMoney(fineAmount)} />
              <InfoRow label="Net pay" value={formatMoney(clearDuePayroll.netPay)} strong />
              <InfoRow label="Already paid" value={formatMoney(clearDuePayroll.totalPaid || 0)} />
            </div>
            <div className="hr-mini-card">
              <h4>Payment</h4>
              <div className="hr-form-grid-2">
                <Field label="Bank">
                  <select value={paymentForm.bankId} onChange={(e) => setPaymentForm((p) => ({ ...p, bankId: e.target.value }))}>
                    <option value="">Select bank</option>
                    {banks.map((bank) => <option key={idOf(bank)} value={idOf(bank)}>{bank.name} - {formatMoney(bank.balance)}</option>)}
                  </select>
                </Field>
                <Field label="Pay Amount"><input type="number" min="0" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} /></Field>
                <Field label="Note" className="hr-span2"><input value={paymentForm.note} onChange={(e) => setPaymentForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional" /></Field>
              </div>
              <InfoRow label="Current due" value={formatMoney(currentDue)} strong />
              <div className="hr-modal-actions mt12">
                <button className="hr-btn hr-btn-primary" onClick={payPayroll} disabled={saving}><CreditCard size={14} /> Pay</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBankTransactionsModal = () => null;

  const renderAddBankMoneyModal = () => {
    if (!addMoneyBank) return null;
    return (
      <div className="hr-modal-backdrop" onClick={() => setAddMoneyBank(null)}>
        <div className="hr-modal small-money-modal" onClick={(e) => e.stopPropagation()}>
          <div className="hr-modal-header">
            <h3>Add Money</h3>
            <button className="hr-icon-btn" onClick={() => setAddMoneyBank(null)}><X size={16} /></button>
          </div>
          <p className="hr-muted">{addMoneyBank.name} | Balance {formatMoney(addMoneyBank.balance)}</p>
          <div className="hr-form-grid-2 mt12">
            <Field label="Amount">
              <input type="number" min="0" step="0.01" value={bankTopUpForm.amount} onChange={(e) => setBankTopUpForm((p) => ({ ...p, amount: e.target.value }))} />
            </Field>
            <Field label="Note">
              <input value={bankTopUpForm.note} onChange={(e) => setBankTopUpForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional" />
            </Field>
          </div>
          <div className="hr-modal-actions mt12">
            <button className="hr-btn hr-btn-ghost" onClick={() => setAddMoneyBank(null)}>Cancel</button>
            <button className="hr-btn hr-btn-primary" onClick={addMoneyToBank} disabled={saving}><Plus size={14} /> Add Money</button>
          </div>
        </div>
      </div>
    );
  };

  const renderBankPayModal = () => {
    if (!payNowBank) return null;
    const isEmployee = bankPaymentForm.partyType === "employee";
    const isOut = bankPaymentForm.direction === "out";
    const isSalaryPayment = isOut && isEmployee && bankPaymentForm.purpose === "salary";
    const isLoanPayment = isOut && isEmployee && bankPaymentForm.purpose === "loan";
    const isAdvancePayment = isOut && isEmployee && bankPaymentForm.purpose === "advance";
    const isDeductiblePayment = isLoanPayment || isAdvancePayment;
    const isLoanRepayment = !isOut && isEmployee && bankPaymentForm.purpose === "loan";
    const selectedStaffLabel = selectedPaymentStaff ? staffLabel(selectedPaymentStaff) : "Select employee";
    return (
      <div className="hr-modal-backdrop" onClick={() => setPayNowBank(null)}>
        <div className="hr-modal payment-modal" onClick={(e) => e.stopPropagation()}>
          <div className="hr-modal-header">
            <h3>Make Payment</h3>
            <button className="hr-icon-btn" onClick={() => setPayNowBank(null)}><X size={16} /></button>
          </div>
          <div className="hr-payment-mode">
            <button className={bankPaymentForm.direction === "out" ? "active" : ""} onClick={() => setBankPaymentForm((p) => {
              const firstPayroll = payrolls.find((payroll) => idOf(payroll.staff) === p.staff && payroll.status !== "paid" && Number(payroll.balanceDue ?? payroll.netPay ?? 0) > 0);
              return { ...p, direction: "out", purpose: "salary", payroll: firstPayroll ? idOf(firstPayroll) : "", amount: firstPayroll ? (firstPayroll.balanceDue ?? firstPayroll.netPay ?? "") : p.amount, loan: "" };
            })}><ArrowUp size={14} /> Payment Out</button>
            <button className={bankPaymentForm.direction === "in" ? "active" : ""} onClick={() => setBankPaymentForm((p) => {
              const firstLoan = activeLoans.find((loan) => idOf(loan.staff) === p.staff);
              return { ...p, direction: "in", purpose: firstLoan ? "loan" : "general", loan: firstLoan ? idOf(firstLoan) : "", payroll: "", emi: "" };
            })}><ArrowDown size={14} /> Payment In</button>
          </div>
          <div className="hr-form-grid-2 mt12">
            <Field label="Bank Account">
              <select value={bankPaymentForm.bankId} onChange={(e) => setBankPaymentForm((p) => ({ ...p, bankId: e.target.value }))}>
                <option value="">Select bank</option>
                {banks.map((bank) => <option key={idOf(bank)} value={idOf(bank)}>{bank.name} - {formatMoney(bank.balance)}</option>)}
              </select>
            </Field>
            <Field label="Payee Type">
              <select value={bankPaymentForm.partyType} onChange={(e) => setBankPaymentForm((p) => ({ ...p, partyType: e.target.value, staff: "", loan: "", beneficiaryName: "", beneficiaryAccount: "" }))}>
                <option value="employee">Employee</option>
                <option value="other">Other</option>
              </select>
            </Field>

            {isEmployee ? (
              <Field label="Employee">
                <select value={bankPaymentForm.staff} onChange={(e) => {
                  const nextStaff = e.target.value;
                  const firstLoan = activeLoans.find((loan) => idOf(loan.staff) === nextStaff);
                  const firstPayroll = payrolls.find((payroll) => idOf(payroll.staff) === nextStaff && payroll.status !== "paid" && Number(payroll.balanceDue ?? payroll.netPay ?? 0) > 0);
                  setBankPaymentForm((p) => ({
                    ...p,
                    staff: nextStaff,
                    purpose: !isOut && !firstLoan ? "general" : p.purpose,
                    loan: firstLoan ? idOf(firstLoan) : "",
                    payroll: p.direction === "out" && p.purpose === "salary" && firstPayroll ? idOf(firstPayroll) : "",
                    amount: p.direction === "out" && p.purpose === "salary" && firstPayroll ? (firstPayroll.balanceDue ?? firstPayroll.netPay ?? "") : p.amount,
                  }));
                }}>
                  <option value="">Select employee</option>
                  {activeStaff.map((person) => <option key={idOf(person)} value={idOf(person)}>{staffLabel(person)}</option>)}
                </select>
              </Field>
            ) : (
              <Field label={isOut ? "Receiver Name" : "Sender Name"}>
                <input value={bankPaymentForm.beneficiaryName} onChange={(e) => setBankPaymentForm((p) => ({ ...p, beneficiaryName: e.target.value }))} />
              </Field>
            )}

            {!isEmployee && (
              <Field label={isOut ? "Receiver Account" : "Reference"}>
                <input value={bankPaymentForm.beneficiaryAccount} onChange={(e) => setBankPaymentForm((p) => ({ ...p, beneficiaryAccount: e.target.value }))} placeholder="Optional" />
              </Field>
            )}

            {isOut && isEmployee && (
              <Field label="Payment Type">
                <select value={bankPaymentForm.purpose} onChange={(e) => {
                  const nextPurpose = e.target.value;
                  const firstPayroll = selectedPaymentPayrolls[0];
                  setBankPaymentForm((p) => ({
                    ...p,
                    purpose: nextPurpose,
                    payroll: nextPurpose === "salary" && firstPayroll ? idOf(firstPayroll) : "",
                    loan: "",
                    emi: ["loan", "advance"].includes(nextPurpose) ? p.emi : "",
                    amount: nextPurpose === "salary" && firstPayroll ? (firstPayroll.balanceDue ?? firstPayroll.netPay ?? "") : "",
                  }));
                }}>
                  <option value="salary">Salary</option>
                  <option value="loan">Loan</option>
                  <option value="advance">Advance</option>
                </select>
              </Field>
            )}

            {!isOut && isEmployee && (
              <Field label="Payment For">
                <select value={bankPaymentForm.purpose} onChange={(e) => setBankPaymentForm((p) => ({ ...p, purpose: e.target.value, loan: e.target.value === "loan" ? p.loan : "" }))}>
                  <option value="loan">EMI / advance received</option>
                  <option value="general">General received</option>
                </select>
              </Field>
            )}

            {isSalaryPayment && (
              <Field label="Generated Payroll">
                <select value={bankPaymentForm.payroll} onChange={(e) => {
                  const payroll = selectedPaymentPayrolls.find((item) => idOf(item) === e.target.value);
                  setBankPaymentForm((p) => ({ ...p, payroll: e.target.value, amount: payroll ? (payroll.balanceDue ?? payroll.netPay ?? "") : p.amount }));
                }}>
                  <option value="">Select payroll</option>
                  {selectedPaymentPayrolls.map((payroll) => (
                    <option key={idOf(payroll)} value={idOf(payroll)}>
                      {payroll.periodLabel || payroll.periodEnd} | Due {formatMoney(payroll.balanceDue ?? payroll.netPay)}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {isLoanRepayment && (
              <Field label="Employee Loan">
                <select value={bankPaymentForm.loan} onChange={(e) => setBankPaymentForm((p) => ({ ...p, loan: e.target.value }))}>
                  <option value="">Select loan</option>
                  {selectedPaymentLoans.map((loan) => (
                    <option key={idOf(loan)} value={idOf(loan)}>
                      {repaymentKindLabel(loan)} {formatMoney(loan.outstanding)} outstanding | deduct {formatMoney(loan.emi)}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label={isLoanPayment ? "Loan Amount" : isSalaryPayment ? "Salary Amount" : isAdvancePayment ? "Advance Amount" : "Amount"}>
              <input type="number" min="0" step="0.01" value={bankPaymentForm.amount} onChange={(e) => setBankPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
            </Field>

            {isDeductiblePayment && (
              <Field label="Deduct From Salary">
                <input type="number" min="0" step="0.01" value={bankPaymentForm.emi} onChange={(e) => setBankPaymentForm((p) => ({ ...p, emi: e.target.value }))} />
              </Field>
            )}

            {(isLoanPayment || isAdvancePayment) && (
              <Field label={isAdvancePayment ? "Advance Date" : "Issue Date"}>
                <input type="date" value={bankPaymentForm.issueDate} onChange={(e) => setBankPaymentForm((p) => ({ ...p, issueDate: e.target.value }))} />
              </Field>
            )}

            <Field label="Note" className="hr-span2">
              <input value={bankPaymentForm.note} onChange={(e) => setBankPaymentForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional" />
            </Field>
          </div>
          <div className="hr-payment-preview mt12">
            <InfoRow label="Bank balance after" value={formatMoney(bankPaymentPreview.nextBankBalance)} strong />
            {isDeductiblePayment && <InfoRow label="Deduction duration" value={bankPaymentPreview.months ? `${bankPaymentPreview.months} payroll${bankPaymentPreview.months === 1 ? "" : "s"}` : "--"} />}
            {isSalaryPayment && <InfoRow label="Salary due after" value={formatMoney(bankPaymentPreview.salaryRemaining)} strong />}
            {isLoanRepayment && <InfoRow label={`Remaining ${selectedPaymentLoan?.category === "advance" ? "advance" : "loan"} for ${selectedStaffLabel}`} value={formatMoney(bankPaymentPreview.loanRemaining)} strong />}
            {!isOut && isEmployee && !isLoanRepayment && <InfoRow label="Received from" value={selectedStaffLabel} />}
          </div>
          <div className="hr-modal-actions mt12">
            <button className="hr-btn hr-btn-ghost" onClick={() => setPayNowBank(null)}>Cancel</button>
            <button className="hr-btn hr-btn-primary" onClick={payFromBank} disabled={saving}><CreditCard size={14} /> Save Payment</button>
          </div>
        </div>
      </div>
    );
  };

  // ─── MAIN RENDER ──────────────────────────────────────────────────────────────
  return (
    <div className="hr-page">
      <style>{hrStyles}</style>

      {notice && (
        <button className={`hr-notice ${notice.type}`} onClick={() => setNotice(null)}>
          {notice.type === "error" ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {notice.text}
        </button>
      )}

      {loading ? (
        <div className="hr-loading-screen"><Clock3 size={28} /> Loading HR system…</div>
      ) : (
        <>
          {/* Top tab bar */}
          <nav className="hr-nav-tabs">
            {HR_MAIN_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} className={`hr-nav-tab ${active === tab.id ? "active" : ""}`} onClick={() => { setActive(tab.id); if (tab.id !== "staff-payroll") setDetailStaffId(""); }}>
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </nav>

          {active === "overview" && renderOverview()}
          {active === "banks-loans" && renderBanksLoans()}
          {active === "staff-payroll" && (detailStaffId ? renderStaffDetail() : renderAttendanceWorkspace())}
        </>
      )}

      {renderToolsModal()}
      {renderOvertimeModal()}
      {renderFineModal()}
      {renderClearDueModal()}
      {renderBankTransactionsModal()}
      {renderAddBankMoneyModal()}
      {renderBankPayModal()}
    </div>
  );
}

// ─── HELPER COMPONENTS ────────────────────────────────────────────────────────

function pillBg(tone) {
  return { green: "#dcfce7", rose: "#ffe4e6", amber: "#fef3c7", blue: "#dbeafe", violet: "#ede9fe", slate: "#e2e8f0" }[tone] || "#e2e8f0";
}
function pillFg(tone) {
  return { green: "#166534", rose: "#be123c", amber: "#92400e", blue: "#1d4ed8", violet: "#6d28d9", slate: "#475569" }[tone] || "#475569";
}

// Compact P / A buttons with ⋮ dropdown (screenshot 1 style)
function InlineAttendanceMark({ status, onMark, onMenuAction, openMenu, onToggleMenu }) {
  const [localOpen, setLocalOpen] = useState(false);
  const isOpen = onToggleMenu ? openMenu : localOpen;
  const toggleMenu = onToggleMenu || (() => setLocalOpen((p) => !p));

  return (
    <div className="hr-inline-att">
      <button className={`hr-att-btn ${status === "present" ? "active" : ""}`} onClick={() => onMark("present")} title="Present">P</button>
      <button className={`hr-att-btn ${status === "absent" ? "active-absent" : ""}`} onClick={() => onMark("absent")} title="Absent">A</button>
      <div className="hr-att-more-wrap">
        <button className="hr-att-more-btn" onClick={(e) => { e.stopPropagation(); toggleMenu(); }} title="More options">
          <MoreVertical size={15} />
        </button>
        {isOpen && (
          <div className="hr-att-menu">
            <button onClick={() => { toggleMenu(); onMenuAction("half_day"); }}>Half day</button>
            <button onClick={() => { toggleMenu(); onMenuAction("paid_leave"); }}>Paid leave</button>
            <button onClick={() => { toggleMenu(); onMenuAction("short_leave"); }}>Short leave</button>
            <button onClick={() => { toggleMenu(); onMenuAction("weekly_off"); }}>Week off</button>
            <button onClick={() => { toggleMenu(); onMenuAction("overtime"); }}>Add overtime</button>
            <button onClick={() => { toggleMenu(); onMenuAction("fine"); }}>Add fine</button>
          </div>
        )}
      </div>
      {status && status !== "present" && status !== "absent" && (
        <span className="hr-att-status-pill" style={{ background: pillBg(ATTENDANCE_STATUS_META[status]?.tone), color: pillFg(ATTENDANCE_STATUS_META[status]?.tone) }}>
          {ATTENDANCE_STATUS_META[status]?.short || status}
        </span>
      )}
    </div>
  );
}

function AttendanceRowMenu({ open, onToggle, onAction }) {
  const options = [
    { id: "half_day", label: "Half Day" },
    { id: "paid_leave", label: "Paid Leave" },
    { id: "short_leave", label: "Short Leave" },
    { id: "overtime", label: "Add Overtime" },
    { id: "fine", label: "Add Fine" },
  ];

  return (
    <div className="hr-att-more-wrap">
      <button className="hr-att-more-btn" onClick={(e) => { e.stopPropagation(); onToggle(); }} title="Attendance options">
        <MoreVertical size={15} />
      </button>
      {open && (
        <div className="hr-att-menu">
          {options.map((option) => (
            <button key={option.id} onClick={(e) => { e.stopPropagation(); onAction(option.id); }}>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`hr-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function DateNavigator({ value, onChange, step = 1, onPrevious, onNext }) {
  const move = (dir) => {
    if (dir < 0 && onPrevious) return onPrevious();
    if (dir > 0 && onNext) return onNext();
    const next = localDate(addCalendarDays(parseDateValue(value || localDate()), dir * step));
    return onChange(next);
  };
  return (
    <div className="hr-date-stepper">
      <button className="hr-icon-btn" onClick={() => move(-1)}><ChevronLeft size={16} /></button>
      <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} />
      <button className="hr-icon-btn" onClick={() => move(1)}><ChevronRight size={16} /></button>
    </div>
  );
}

function InfoRow({ label, value, strong }) {
  return (
    <div className="hr-info-row">
      <span>{label}</span>
      <strong className={strong ? "strong-val" : ""}>{value}</strong>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const hrStyles = `
  .hr-page {
    min-height: calc(100vh - 138px);
    color: var(--app-text);
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --hr-primary: #4f46e5;
    --hr-primary-dark: #3730a3;
    --hr-green: #0f766e;
    --hr-line: #e2e8f0;
    --hr-muted: #64748b;
    --hr-bg: var(--card-bg, #fff);
  }

  /* ── Nav tabs ── */
  .hr-nav-tabs {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  }
  .hr-nav-tab {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 40px;
    padding: 0 16px;
    border: 1.5px solid var(--hr-line);
    border-radius: 8px;
    background: var(--hr-bg);
    color: var(--hr-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .hr-nav-tab.active {
    background: var(--hr-primary);
    border-color: var(--hr-primary);
    color: #fff;
  }
  .hr-nav-tab.ml-auto { margin-left: auto; }

  /* ── Main section ── */
  .hr-main-section {
    border: 1px solid var(--hr-line);
    border-radius: 10px;
    background: var(--hr-bg);
    overflow: visible;
    box-shadow: 0 1px 4px rgba(15,23,42,0.07);
  }
  .hr-section-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 20px;
    border-bottom: 1px solid var(--hr-line);
    flex-wrap: wrap;
  }
  .hr-section-topbar h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--app-text);
  }
  .hr-topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* ── Date bar ── */
  .hr-date-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .hr-date-bar h2 {
    margin: 0;
    font-size: 17px;
    font-weight: 600;
  }
  .hr-date-nav-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ── Summary strip ── */
  .hr-summary-strip {
    display: grid;
    grid-template-columns: repeat(5, minmax(110px, 1fr));
    border-top: 1px solid var(--hr-line);
    border-bottom: 1px solid var(--hr-line);
  }
  .hr-summary-cell {
    padding: 14px 20px;
    border-right: 1px solid var(--hr-line);
  }
  .hr-summary-cell:last-child { border-right: none; }
  .hr-summary-cell span { display: block; font-size: 13px; color: var(--hr-muted); margin-bottom: 4px; }
  .hr-summary-cell strong { font-size: 20px; font-weight: 600; color: var(--app-text); }

  /* ── Attendance table ── */
  .hr-att-table-wrap {
    overflow: visible;
  }
  .hr-att-table {
    width: 100%;
    min-width: 820px;
    border-collapse: collapse;
  }
  .hr-att-table th {
    padding: 10px 20px;
    background: #f8fafc;
    border-bottom: 1px solid var(--hr-line);
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
    text-align: left;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .hr-att-table td {
    padding: 12px 20px;
    border-bottom: 1px solid var(--hr-line);
    font-size: 14px;
    color: var(--app-text);
    vertical-align: middle;
  }
  .hr-att-table tbody tr:last-child td { border-bottom: none; }
  .hr-att-table tfoot td {
    background: #fff;
    border-top: 1.5px solid var(--hr-line);
    border-bottom: none;
    font-size: 14px;
    padding: 12px 20px;
  }
  .hr-pending-footer strong { font-weight: 600; }
  .hr-footer-balance {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
  }
  .hr-footer-balance.due { color: #e11d48; }
  .hr-footer-balance.settled { color: #16a34a; }
  .hr-att-row { cursor: pointer; }
  .hr-att-row:hover td { background: rgba(79,70,229,0.04); }
  .hr-staff-cell strong { display: block; font-weight: 600; }
  .hr-staff-cell small { display: block; font-size: 12px; color: var(--hr-muted); margin-top: 2px; }
  .hr-att-table td strong { display: block; font-weight: 600; }
  .hr-att-table td small { display: block; font-size: 12px; color: var(--hr-muted); margin-top: 2px; }
  .hr-hourly-action {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  /* ── Balance chip ── */
  .hr-balance-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
    font-size: 14px;
  }
  .hr-balance-chip.due { color: #e11d48; }
  .hr-balance-chip.settled { color: #16a34a; }
  .hr-overdue { color: #e11d48; font-weight: 600; }
  .hr-overdue-label { font-size: 12px; margin-left: 4px; color: #e11d48; }

  /* ── Inline attendance mark (P/A + ⋮) ── */
  .hr-inline-att {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    position: relative;
  }
  .hr-att-btn {
    width: 32px;
    height: 32px;
    border: 1.5px solid #cbd5e1;
    border-radius: 6px;
    background: transparent;
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .hr-att-btn.active { background: #16a34a; border-color: #16a34a; color: #fff; }
  .hr-att-btn.active-absent { background: #e11d48; border-color: #e11d48; color: #fff; }
  .hr-att-more-wrap { position: relative; }
  .hr-att-more-btn {
    width: 28px;
    height: 32px;
    border: 1.5px solid #cbd5e1;
    border-radius: 6px;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .hr-att-menu {
    position: absolute;
    top: auto;
    bottom: calc(100% + 4px);
    right: 0;
    z-index: 3000;
    min-width: 140px;
    border: 1px solid var(--hr-line);
    border-radius: 8px;
    background: var(--hr-bg);
    box-shadow: 0 8px 24px rgba(15,23,42,0.15);
    overflow: visible;
  }
  .hr-att-menu button {
    width: 100%;
    min-height: 36px;
    border: 0;
    border-bottom: 1px solid #f1f5f9;
    background: transparent;
    color: var(--app-text);
    text-align: left;
    padding: 0 14px;
    font-size: 13px;
    cursor: pointer;
  }
  .hr-att-menu button:hover { background: #f8fafc; }
  .hr-att-menu button:last-child { border-bottom: none; }
  .hr-att-status-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 3px 9px;
    font-size: 12px;
    font-weight: 600;
  }
  .hr-att-status-pill.wo { background: #e2e8f0; color: #475569; }

  /* ── Buttons ── */
  .hr-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    padding: 0 14px;
    border: 1.5px solid var(--hr-line);
    border-radius: 8px;
    background: var(--hr-bg);
    color: var(--app-text);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
  }
  .hr-btn.hr-btn-primary { background: var(--hr-primary); border-color: var(--hr-primary); color: #fff; }
  .hr-btn.hr-btn-primary:hover { background: var(--hr-primary-dark); border-color: var(--hr-primary-dark); }
  .hr-btn.hr-btn-ghost { background: var(--hr-bg); }
  .hr-btn.hr-btn-ghost:hover { background: #f8fafc; }
  .hr-btn.hr-btn-outline-danger { border-color: #fecaca; color: #dc2626; background: #fff; font-size: 13px; min-height: 30px; padding: 0 10px; }
  .hr-btn.compact { min-height: 30px; padding: 0 10px; font-size: 12px; }
  .hr-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .hr-icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1.5px solid var(--hr-line);
    border-radius: 8px;
    background: var(--hr-bg);
    color: var(--app-text);
    cursor: pointer;
    padding: 0;
  }
  .hr-icon-btn.danger { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
  .hr-icon-btn:hover { background: #f8fafc; }

  /* ── Detail layout ── */
  .hr-detail-layout {
    display: grid;
    grid-template-columns: 320px minmax(0,1fr);
    border: 1px solid var(--hr-line);
    border-radius: 10px;
    background: var(--hr-bg);
    min-height: calc(100vh - 148px);
    overflow: visible;
  }
  .hr-detail-rail {
    border-right: 1px solid var(--hr-line);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 12px;
    align-self: start;
    max-height: calc(100vh - 24px);
    background: var(--hr-bg);
    z-index: 2;
  }
  .hr-rail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    border-bottom: 1px solid var(--hr-line);
  }
  .hr-rail-head h2 { margin: 0; font-size: 16px; font-weight: 600; }
  .hr-rail-scroll { flex: 1; min-height: 0; overflow-y: auto; }
  .hr-rail-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border: 0;
    border-bottom: 1px solid var(--hr-line);
    background: transparent;
    color: var(--app-text);
    text-align: left;
    cursor: pointer;
    min-height: 70px;
  }
  .hr-rail-item strong { display: block; font-weight: 600; font-size: 14px; }
  .hr-rail-item small { display: block; font-size: 12px; color: var(--hr-muted); margin-top: 3px; }
  .hr-rail-item b { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; white-space: nowrap; }
  .hr-rail-item b.due { color: #e11d48; }
  .hr-rail-item b.settled { color: #16a34a; }
  .hr-rail-item.selected, .hr-rail-item:hover { background: rgba(79,70,229,0.06); }

  /* ── Detail main ── */
  .hr-detail-main { display: flex; flex-direction: column; min-width: 0; }
  .hr-detail-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 20px;
    border-bottom: 1px solid var(--hr-line);
    gap: 12px;
    flex-wrap: wrap;
  }
  .hr-detail-title { display: flex; align-items: center; gap: 12px; }
  .hr-detail-title h1 { margin: 0; font-size: 20px; font-weight: 600; }
  .hr-detail-tabs {
    display: flex;
    border-bottom: 1px solid var(--hr-line);
  }
  .hr-detail-tabs button {
    flex: 1;
    min-height: 46px;
    border: 0;
    border-bottom: 2.5px solid transparent;
    background: transparent;
    color: var(--hr-muted);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }
  .hr-detail-tabs button.active { color: var(--hr-primary); border-bottom-color: var(--hr-primary); }
  .hr-detail-body { padding: 20px; flex: 1; overflow: visible; }
  .hr-detail-month-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .hr-detail-month-bar h3 { margin: 0; font-size: 17px; font-weight: 600; }
  .hr-month-nav { display: flex; align-items: center; gap: 6px; }
  .hr-month-nav input { min-height: 34px; border: 1.5px solid var(--hr-line); border-radius: 7px; background: var(--hr-bg); color: var(--app-text); padding: 4px 8px; }

  /* Detail attendance table */
  .hr-detail-att-table-wrap { overflow: visible; margin-top: 10px; border: 1px solid var(--hr-line); border-radius: 8px; }
  .hr-detail-att-table { width: 100%; min-width: 940px; border-collapse: collapse; }
  .hr-detail-att-table.compact { min-width: 620px; }
  .hr-detail-att-table th { padding: 10px 16px; background: #f8fafc; border-bottom: 1px solid var(--hr-line); color: #64748b; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-align: left; white-space: nowrap; }
  .hr-detail-att-table td { padding: 10px 16px; border-bottom: 1px solid var(--hr-line); font-size: 14px; }
  .hr-detail-att-table tbody tr:last-child td { border-bottom: none; }
  .hr-detail-att-table td strong { font-weight: 600; display: block; }
  .hr-detail-att-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .hr-detail-quick-mark {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .hr-att-adjustment-note {
    display: inline-flex;
    align-items: center;
    color: #64748b;
    font-size: 12px;
    white-space: nowrap;
  }
  .hr-mini-input {
    width: 88px;
    min-height: 32px;
    border: 1.5px solid var(--hr-line);
    border-radius: 7px;
    background: var(--hr-bg);
    color: var(--app-text);
    padding: 4px 8px;
    font-size: 13px;
    outline: none;
  }
  .hr-mini-input:disabled {
    background: #f8fafc;
    color: #94a3b8;
    cursor: not-allowed;
  }
  .hr-time-input { width: 112px; }
  .hr-hours-input { width: 92px; font-weight: 600; }
  .hr-readonly-hours {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 72px;
    min-height: 30px;
    padding: 0 10px;
    border: 1px solid #e2e8f0;
    border-radius: 7px;
    background: #f8fafc;
    color: #0f172a;
    font-size: 13px;
    font-weight: 600;
  }

  /* Payroll detail */
  .hr-detail-payroll { display: flex; flex-direction: column; gap: 14px; }
  .hr-payroll-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .hr-payroll-toolbar select { min-height: 36px; border: 1.5px solid var(--hr-line); border-radius: 7px; background: var(--hr-bg); color: var(--app-text); padding: 4px 10px; }
  .hr-cycle-caption { font-size: 12px; color: var(--hr-muted); font-weight: 600; }
  .hr-payroll-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .hr-payroll-detail-card { border: 1px solid var(--hr-line); border-radius: 8px; padding: 14px; }
  .hr-payroll-detail-card h4 { margin: 0 0 10px; font-size: 15px; font-weight: 600; }
  .wide-action { width: 100%; margin-top: 12px; justify-content: center; }

  /* ── Noticesssssssssssssssssssssssssssssssssss ── */
  .hr-notice {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 8px;
    margin-bottom: 12px;
    border: none;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
  }
  .hr-notice.success { background: #dcfce7; color: #166534; }
  .hr-notice.error { background: #fee2e2; color: #b91c1c; }

  /* ── Pills ── */
  .hr-pill {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 600;
  }
  .hr-pill.green { background: #dcfce7; color: #166534; }
  .hr-pill.amber { background: #fef3c7; color: #92400e; }
  .hr-pill.blue { background: #dbeafe; color: #1d4ed8; }
  .hr-pill.violet { background: #ede9fe; color: #6d28d9; }
  .hr-pill.rose { background: #ffe4e6; color: #be123c; }
  .hr-pill.slate { background: #e2e8f0; color: #475569; }

  /* ── Date stepper ── */
  .hr-date-stepper { display: flex; align-items: center; gap: 4px; }
  .hr-date-stepper input { min-height: 36px; border: 1.5px solid var(--hr-line); border-radius: 7px; background: var(--hr-bg); color: var(--app-text); padding: 4px 10px; font-size: 13px; }

  /* ── Forms ── */
  .hr-form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .hr-form-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .hr-span2 { grid-column: 1 / -1; }
  .hr-shift-preview {
    display: grid;
    gap: 3px;
    align-self: end;
    min-height: 58px;
    padding: 8px 10px;
    border: 1px solid var(--hr-line);
    border-radius: 8px;
    background: #f8fafc;
  }
  .hr-shift-preview span,
  .hr-shift-preview small {
    color: var(--hr-muted);
    font-size: 12px;
  }
  .hr-shift-preview strong {
    font-size: 13px;
    font-weight: 600;
  }
  .hr-field { display: grid; gap: 5px; }
  .hr-field span { font-size: 12px; font-weight: 600; color: var(--hr-muted); }
  .hr-field input, .hr-field select {
    width: 100%;
    min-height: 36px;
    border: 1.5px solid var(--hr-line);
    border-radius: 7px;
    background: var(--hr-bg);
    color: var(--app-text);
    padding: 6px 10px;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }
  .hr-field-label { font-size: 12px; font-weight: 600; color: var(--hr-muted); display: block; margin-bottom: 6px; }
  .hr-form-actions-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
  .hr-check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .hr-day-checks { display: flex; gap: 6px; flex-wrap: wrap; }
  .hr-day-check { display: inline-flex; align-items: center; gap: 5px; min-height: 32px; padding: 0 10px; border: 1.5px solid var(--hr-line); border-radius: 6px; background: var(--hr-bg); font-size: 13px; cursor: pointer; }
  .hr-day-check.active { border-color: var(--hr-primary); background: rgba(79,70,229,0.08); color: var(--hr-primary); font-weight: 600; }
  .hr-day-check input { display: none; }
  .hr-required { color: #e11d48; }
  .hr-salary-preview {
    border: 1px solid var(--hr-line);
    border-radius: 8px;
    background: #f8fafc;
    padding: 10px 12px;
  }
  .hr-salary-preview > span {
    display: block;
    color: var(--hr-muted);
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
  }
  .hr-salary-preview div {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .hr-salary-preview strong {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    border: 1px solid var(--hr-line);
    border-radius: 7px;
    background: #fff;
    padding: 0 10px;
    font-size: 13px;
    font-weight: 600;
    color: var(--app-text);
  }

  /* ── Info rows ── */
  .hr-info-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: var(--hr-muted); }
  .hr-info-row:last-child { border-bottom: none; }
  .hr-info-row strong { color: var(--app-text); font-weight: 600; text-align: right; }
  .hr-info-row strong.strong-val { color: var(--hr-green); font-size: 15px; }
  .hr-info-actions { display: flex; gap: 8px; margin-top: 12px; }

  /* ── Cards ── */
  .hr-mini-card { border: 1px solid var(--hr-line); border-radius: 8px; padding: 14px; }
  .hr-mini-card h4 { margin: 0 0 10px; font-size: 15px; font-weight: 600; }
  .hr-mini-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  .hr-mini-table th { padding: 7px 10px; background: #f8fafc; border-bottom: 1px solid var(--hr-line); font-size: 12px; font-weight: 600; color: #64748b; text-align: left; }
  .hr-mini-table td { padding: 8px 10px; border-bottom: 1px solid var(--hr-line); font-size: 13px; }
  .hr-mini-table td strong,
  .hr-mini-table td small { display: block; }
  .hr-mini-table td small { color: var(--hr-muted); font-size: 12px; margin-top: 2px; }
  .hr-mini-table tbody tr:last-child td { border-bottom: none; }
  .staff-tx-table { min-width: 820px; }
  .staff-tx-table th:nth-child(5),
  .staff-tx-table td:nth-child(5) { text-align: right; white-space: nowrap; }
  .hr-emi-line { color: #9f1239 !important; font-weight: 600; }
  .hr-loan-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .hr-loan-row:last-child { border-bottom: none; }
  .hr-loan-row strong, .hr-loan-row small { display: block; }
  .hr-loan-row small { color: var(--hr-muted); font-size: 12px; }

  /* ── Tools panel ── */
  .hr-tools-panel { padding: 4px 0; }
  .hr-tools-panel h3 { margin: 0 0 4px; font-size: 17px; font-weight: 600; }
  .hr-tools-panel p { margin: 0 0 14px; font-size: 13px; color: var(--hr-muted); }

  /* ── Department list ── */
  .hr-dept-list { margin-top: 20px; display: grid; gap: 10px; }
  .hr-dept-card { border: 1px solid var(--hr-line); border-radius: 8px; padding: 12px; }
  .hr-dept-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
  .hr-dept-card strong { display: block; font-weight: 600; font-size: 14px; }
  .hr-dept-card small { display: block; font-size: 12px; color: var(--hr-muted); margin-top: 2px; }
  .hr-dept-meta { display: flex; gap: 16px; font-size: 12px; color: var(--hr-muted); }
  .hr-row-actions { display: flex; align-items: center; gap: 6px; }

  /* ── Finance ── */
  .hr-finance-strip { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; padding: 20px 24px; border-bottom: 1px solid var(--hr-line); }
  .hr-finance-strip div { padding: 14px 16px; border: 1px solid var(--hr-line); border-radius: 8px; background: #fbfdff; }
  .hr-finance-strip span { display: block; font-size: 12px; color: var(--hr-muted); margin-bottom: 4px; }
  .hr-finance-strip strong { font-size: 18px; font-weight: 600; }
  .hr-banks-block { padding: 22px 24px 0; }
  .hr-transactions-block { padding: 18px 24px 24px; }
  .hr-sub-head-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 10px;
  }
  .hr-sub-head-row .hr-sub-h,
  .hr-sub-head-row h3,
  .hr-sub-head-row p { margin-bottom: 0; }
  .hr-bank-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(330px, 1fr)); gap: 14px; }
  .hr-finance-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid var(--hr-line); border-radius: 8px; margin-bottom: 8px; flex-wrap: wrap; background: #fff; }
  .hr-bank-card { cursor: pointer; margin-bottom: 0; }
  .hr-bank-card:hover,
  .hr-bank-card.selected {
    border-color: var(--hr-primary);
    background: rgba(79,70,229,0.05);
  }
  .hr-bank-card-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex: 1 1 260px;
    min-width: 0;
  }
  .hr-bank-view-hint {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 8px;
    border: 1px solid #dbe3ef;
    border-radius: 999px;
    color: var(--hr-primary);
    background: #f8fafc;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }
  .hr-finance-card strong, .hr-finance-card small { display: block; }
  .hr-finance-card small { color: var(--hr-muted); font-size: 12px; margin-top: 2px; }
  .hr-finance-card b { font-size: 16px; color: var(--hr-green); margin-left: auto; white-space: nowrap; }
  .hr-finance-card-actions { display: flex; align-items: center; gap: 8px; width: 100%; padding-top: 4px; }
  .hr-finance-card-actions input { flex: 1; min-height: 32px; border: 1.5px solid var(--hr-line); border-radius: 7px; background: var(--hr-bg); color: var(--app-text); padding: 4px 8px; font-size: 13px; }
  .hr-finance-table-wrap {
    border: 1px solid var(--hr-line);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }
  .bank-tx-modal {
    width: min(980px, 96vw);
    display: flex;
    flex-direction: column;
    max-height: 90vh;
    overflow: hidden;
  }
  .bank-tx-modal .hr-finance-table-wrap {
    max-height: min(520px, calc(90vh - 210px));
    overflow: auto;
  }
  .bank-tx-table {
    min-width: 820px;
    table-layout: fixed;
  }
  .bank-tx-table th:nth-child(1),
  .bank-tx-table td:nth-child(1) { width: 106px; }
  .bank-tx-table th:nth-child(2),
  .bank-tx-table td:nth-child(2) { width: 180px; }
  .bank-tx-table th:nth-child(4),
  .bank-tx-table td:nth-child(4),
  .bank-tx-table th:nth-child(5),
  .bank-tx-table td:nth-child(5) {
    width: 160px;
    text-align: right;
    white-space: nowrap;
  }
  .bank-tx-table th,
  .bank-tx-table td {
    padding-left: 14px;
    padding-right: 14px;
  }
  .bank-tx-table td strong,
  .bank-tx-table td small {
    overflow-wrap: anywhere;
  }
  .bank-tx-table td:nth-child(4) strong,
  .bank-tx-table td:nth-child(4) small,
  .bank-tx-table td:nth-child(5) strong,
  .bank-tx-table td:nth-child(5) small {
    overflow-wrap: normal;
  }
  .hr-bank-modal-summary {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr;
    gap: 10px;
  }
  .hr-bank-modal-summary div {
    padding: 12px;
    border: 1px solid var(--hr-line);
    border-radius: 8px;
    background: #fbfdff;
  }
  .hr-bank-modal-summary span,
  .hr-bank-modal-summary small {
    display: block;
    color: var(--hr-muted);
    font-size: 12px;
  }
  .hr-bank-modal-summary strong {
    display: block;
    margin: 2px 0;
    font-size: 15px;
    font-weight: 700;
  }
  .hr-cash-bank-layout {
    display: grid;
    grid-template-columns: 360px minmax(0, 1fr);
    min-height: calc(100vh - 224px);
    border-top: 1px solid var(--hr-line);
  }
  .hr-bank-ledger-rail {
    border-right: 1px solid var(--hr-line);
    background: #fff;
  }
  .hr-ledger-balance {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 74px;
    padding: 18px 14px;
    border-bottom: 1px solid var(--hr-line);
  }
  .hr-ledger-balance.subtle {
    min-height: 56px;
    background: #fbfdff;
  }
  .hr-ledger-balance span,
  .hr-ledger-section-title span {
    color: var(--hr-muted);
    font-size: 13px;
    font-weight: 600;
  }
  .hr-ledger-balance strong {
    font-size: 17px;
    font-weight: 700;
    text-align: right;
  }
  .hr-ledger-section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px;
    border-bottom: 1px solid var(--hr-line);
  }
  .hr-link-btn {
    border: 0;
    background: transparent;
    color: var(--hr-primary);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    padding: 0;
    white-space: nowrap;
  }
  .hr-bank-ledger-list {
    display: grid;
    max-height: calc(100vh - 420px);
    overflow-y: auto;
  }
  .hr-bank-ledger-item {
    width: 100%;
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    align-items: center;
    gap: 12px;
    min-height: 78px;
    padding: 12px 14px;
    border: 0;
    border-bottom: 1px solid var(--hr-line);
    background: transparent;
    color: var(--app-text);
    cursor: pointer;
    text-align: left;
  }
  .hr-bank-ledger-item:hover,
  .hr-bank-ledger-item.selected {
    background: rgba(79,70,229,0.08);
  }
  .hr-bank-ledger-item strong,
  .hr-bank-ledger-item small {
    display: block;
  }
  .hr-bank-ledger-item strong {
    font-size: 14px;
    font-weight: 700;
  }
  .hr-bank-ledger-item small {
    color: var(--hr-muted);
    font-size: 12px;
    margin-top: 3px;
    overflow-wrap: anywhere;
  }
  .hr-bank-ledger-item b {
    color: var(--app-text);
    font-size: 14px;
    white-space: nowrap;
  }
  .hr-bank-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: #eef2ff;
    color: var(--hr-primary);
  }
  .hr-bank-ledger-detail {
    min-width: 0;
    background: #fff;
  }
  .hr-bank-detail-tabs {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 58px;
    border-bottom: 1px solid var(--hr-line);
    background: #fff;
  }
  .hr-bank-detail-tabs button {
    align-self: stretch;
    min-width: 150px;
    border: 0;
    border-right: 1px solid var(--hr-line);
    background: #f4f3ff;
    color: var(--hr-primary);
    font-size: 14px;
    font-weight: 700;
    cursor: default;
  }
  .hr-bank-detail-tabs .hr-pill {
    margin-right: 14px;
  }
  .hr-bank-account-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 18px;
    min-height: 116px;
    padding: 18px 20px;
    border-bottom: 1px solid var(--hr-line);
  }
  .hr-bank-account-summary span,
  .hr-bank-account-summary small {
    display: block;
    color: var(--hr-muted);
    font-size: 13px;
  }
  .hr-bank-account-summary strong {
    display: block;
    margin: 4px 0;
    font-size: 17px;
    font-weight: 700;
  }
  .hr-bank-account-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  }
  .hr-bank-ledger-table {
    margin: 18px 20px;
  }
  .hr-bank-filter-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 20px 0;
    flex-wrap: wrap;
  }
  .hr-bank-filter-controls,
  .hr-bank-filter-totals {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .hr-bank-filter-controls select,
  .hr-bank-filter-controls input {
    min-height: 36px;
    border: 1.5px solid var(--hr-line);
    border-radius: 7px;
    background: var(--hr-bg);
    color: var(--app-text);
    padding: 4px 10px;
    font-size: 13px;
  }
  .hr-bank-filter-totals span {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
  }
  .hr-bank-filter-totals .in {
    background: #dcfce7;
    color: #166534;
  }
  .hr-bank-filter-totals .out {
    background: #fee2e2;
    color: #991b1b;
  }
  .hr-amount.in {
    color: var(--hr-green);
  }
  .hr-amount.out {
    color: #dc2626;
  }
  .hr-loans-list { display: grid; gap: 10px; margin-top: 12px; }
  .hr-loan-card {
    display: grid;
    grid-template-columns: minmax(170px, 1.4fr) repeat(3, minmax(95px, 1fr)) auto;
    gap: 12px;
    align-items: center;
    padding: 12px;
    border: 1px solid var(--hr-line);
    border-radius: 8px;
  }
  .hr-loan-card strong,
  .hr-loan-card small,
  .hr-loan-card span { display: block; }
  .hr-loan-card span,
  .hr-loan-card small { color: var(--hr-muted); font-size: 12px; }
  .hr-loan-card strong { font-size: 14px; font-weight: 600; }
  .hr-loan-card-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }

  /* ── Overview metrics ── */
  .hr-metrics-row { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; padding: 16px 20px; border-bottom: 1px solid var(--hr-line); }
  .hr-metric-card { display: flex; align-items: center; gap: 12px; padding: 14px; border: 1px solid var(--hr-line); border-radius: 8px; }
  .hr-metric-card > svg { width: 40px; height: 40px; padding: 8px; border-radius: 8px; flex-shrink: 0; }
  .hr-metric-card span { display: block; font-size: 12px; color: var(--hr-muted); margin-bottom: 3px; }
  .hr-metric-card strong { font-size: 17px; font-weight: 600; }
  .hr-metric-card.blue svg { background: #dbeafe; color: #1d4ed8; }
  .hr-metric-card.green svg { background: #dcfce7; color: #16a34a; }
  .hr-metric-card.violet svg { background: #ede9fe; color: #6d28d9; }
  .hr-metric-card.amber svg { background: #fef3c7; color: #b45309; }
  .hr-metric-card.rose svg { background: #ffe4e6; color: #be123c; }
  .hr-metric-card.slate svg { background: #e2e8f0; color: #475569; }
  .hr-overview-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    padding: 0 20px 20px;
  }
  .hr-overview-wide {
    grid-column: 1 / -1;
    overflow-x: auto;
  }
  .overview-tx-table {
    min-width: 880px;
  }
  .overview-tx-table th:nth-child(5),
  .overview-tx-table td:nth-child(5),
  .overview-tx-table th:nth-child(6),
  .overview-tx-table td:nth-child(6) {
    text-align: right;
    white-space: nowrap;
  }

  /* ── Modal ── */
  .hr-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(15,23,42,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .hr-modal {
    width: min(780px, 96vw);
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 12px;
    background: var(--hr-bg);
    box-shadow: 0 24px 60px rgba(15,23,42,0.25);
    padding: 20px;
  }
  .hr-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .hr-modal-header h3 { margin: 0; font-size: 18px; font-weight: 600; }
  .hr-modal-actions { display: flex; justify-content: flex-end; gap: 8px; }
  .small-money-modal { width: min(520px, 96vw); }
  .payment-modal { width: min(720px, 96vw); }
  .hr-payment-mode {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border: 1.5px solid var(--hr-line);
    border-radius: 8px;
    overflow: hidden;
    background: #fff;
  }
  .hr-payment-mode button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 40px;
    border: 0;
    background: #fff;
    color: var(--hr-muted);
    font-weight: 700;
    cursor: pointer;
  }
  .hr-payment-mode button + button {
    border-left: 1px solid var(--hr-line);
  }
  .hr-payment-mode button.active {
    background: var(--hr-primary);
    color: #fff;
  }
  .hr-payment-preview {
    border: 1px solid var(--hr-line);
    border-radius: 8px;
    background: #fbfdff;
    padding: 6px 12px;
  }

  /* ── Overtime modal ── */
  .ot-modal { width: min(580px, 96vw); }
  .ot-info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 14px; border: 1px solid var(--hr-line); border-radius: 8px; margin-bottom: 16px; }
  .ot-info-row span { display: block; font-size: 12px; color: var(--hr-muted); margin-bottom: 4px; }
  .ot-info-row strong { font-size: 14px; font-weight: 600; }
  .ot-type-row { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
  .ot-radio { display: flex; align-items: center; gap: 6px; font-size: 14px; cursor: pointer; }
  .ot-radio input { accent-color: var(--hr-primary); }
  .ot-hours-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .hr-muted-label { font-size: 12px; font-weight: 600; color: var(--hr-muted); display: block; margin-bottom: 6px; }
  .ot-time-input { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .ot-hrs-input { width: 60px; min-height: 36px; border: 1.5px solid var(--hr-line); border-radius: 7px; padding: 4px 8px; text-align: center; font-size: 14px; background: var(--hr-bg); color: var(--app-text); }
  .ot-colon { font-size: 18px; font-weight: 600; }
  .ot-time-input select { min-height: 36px; border: 1.5px solid var(--hr-line); border-radius: 7px; padding: 4px 8px; background: var(--hr-bg); color: var(--app-text); }
  .ot-rate-input { display: flex; align-items: center; gap: 8px; }
  .ot-rate-input select { flex: 1; min-height: 36px; border: 1.5px solid var(--hr-line); border-radius: 7px; padding: 4px 8px; background: var(--hr-bg); color: var(--app-text); }
  .ot-rate-value { font-size: 14px; font-weight: 600; white-space: nowrap; padding: 6px 10px; border: 1.5px solid var(--hr-line); border-radius: 7px; }
  .ot-fixed-row { margin-bottom: 16px; }
  .ot-fixed-input { width: 100%; min-height: 36px; border: 1.5px solid var(--hr-line); border-radius: 7px; padding: 4px 10px; background: var(--hr-bg); color: var(--app-text); font-size: 14px; margin-top: 6px; }
  .ot-total { padding: 12px; background: #f8fafc; border-radius: 8px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .ot-total span { font-size: 13px; color: var(--hr-muted); }
  .ot-total strong { font-size: 16px; font-weight: 600; }

  /* ── Misc ── */
  .hr-empty-cell { text-align: center; color: var(--hr-muted) !important; padding: 40px !important; }
  .hr-empty-block { padding: 40px; text-align: center; color: var(--hr-muted); }
  .hr-empty-block.compact { padding: 24px 14px; }
  .hr-loading { padding: 12px; color: var(--hr-muted); font-size: 13px; }
  .hr-loading-screen { min-height: 300px; display: flex; align-items: center; justify-content: center; gap: 12px; color: var(--hr-muted); }
  .hr-muted { color: var(--hr-muted); font-size: 13px; }
  .hr-sub-h { font-size: 16px; font-weight: 600; margin: 0 0 10px; color: var(--app-text); }
  .hr-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .hr-detail-transactions { padding: 0; }
  .hr-detail-payroll, .hr-detail-transactions { display: flex; flex-direction: column; gap: 14px; }
  .hr-detail-transactions .hr-mini-card { overflow-x: auto; }
  .mt12 { margin-top: 12px; }
  .mt16 { margin-top: 16px; }

  /* ── Responsive ── */
  @media (max-width: 1024px) {
    .hr-detail-layout { grid-template-columns: 1fr; }
    .hr-detail-rail { display: none; }
    .hr-payroll-detail-grid, .hr-two-col { grid-template-columns: 1fr; }
    .hr-overview-grid { grid-template-columns: 1fr; }
    .hr-bank-modal-summary { grid-template-columns: 1fr 1fr; }
    .hr-loan-card { grid-template-columns: 1fr 1fr; }
    .hr-metrics-row { grid-template-columns: repeat(2,1fr); }
    .hr-summary-strip { grid-template-columns: repeat(3, 1fr); }
    .hr-form-grid-3 { grid-template-columns: 1fr 1fr; }
    .hr-cash-bank-layout { grid-template-columns: 1fr; }
    .hr-bank-ledger-rail { border-right: 0; border-bottom: 1px solid var(--hr-line); }
    .hr-bank-ledger-list { max-height: none; }
    .hr-bank-account-summary { grid-template-columns: 1fr; align-items: stretch; }
  }
  @media (max-width: 640px) {
    .hr-metrics-row, .hr-summary-strip, .hr-finance-strip { grid-template-columns: 1fr; }
    .hr-section-topbar, .hr-detail-topbar { flex-direction: column; align-items: stretch; }
    .hr-form-grid-2, .hr-form-grid-3 { grid-template-columns: 1fr; }
    .hr-bank-grid, .hr-bank-modal-summary, .hr-loan-card { grid-template-columns: 1fr; }
    .bank-tx-modal { width: 96vw; padding: 14px; }
    .bank-tx-modal .hr-finance-table-wrap { max-height: calc(90vh - 260px); }
    .hr-loan-card-actions { justify-content: flex-start; }
    .hr-ot-hours-row { grid-template-columns: 1fr; }
    .hr-nav-tabs { gap: 4px; }
    .hr-nav-tab { padding: 0 10px; font-size: 12px; }
    .hr-main-section { overflow: visible; }
    .hr-bank-ledger-item { grid-template-columns: 32px minmax(0, 1fr); }
    .hr-bank-ledger-item b { grid-column: 2; }
    .hr-bank-detail-tabs { align-items: stretch; flex-direction: column; }
    .hr-bank-detail-tabs .hr-pill { align-self: flex-start; margin: 10px 14px; }
    .hr-payment-mode { grid-template-columns: 1fr; }
    .hr-payment-mode button + button { border-left: 0; border-top: 1px solid var(--hr-line); }
    .hr-att-table-wrap, .hr-detail-att-table-wrap { overflow-x: auto; overflow-y: visible; }
  }
`;
