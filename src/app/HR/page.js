"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BadgeDollarSign,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Country, State, City } from "country-state-city";
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
  { id: "banks-loans", label: "Banks & Advances", icon: Landmark },
];
const HR_PERMISSION_KEYS = [
  "canViewBanks",
  "canManageBanks",
  "canMakePayments",
  "canManageAdvances",
  "canAddStaff",
  "canEditStaff",
  "canDeleteStaff",
  "canMarkAttendance",
  "canGenerateSalarySlip",
];
const normalizeHrPermissions = (permissions = {}) =>
  HR_PERMISSION_KEYS.reduce((acc, key) => {
    acc[key] = permissions?.[key] !== undefined ? Boolean(permissions[key]) : true;
    return acc;
  }, {});

const PAYROLL_CYCLE_OPTIONS = [1, 7, 15];
const WORK_DAYS_PER_MONTH = 26;
const PAYROLL_SCOPE_OPTIONS = [
  { id: "daily", label: "Daily" },
  ...PAYROLL_CYCLE_OPTIONS.map((day) => ({ id: `monthly:${day}`, label: `${day} to ${day}` })),
];
const TRANSACTION_RANGE_OPTIONS = [
  { id: "all", label: "All Transactions" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "this_week", label: "This Week" },
  { id: "last_week", label: "Last Week" },
  { id: "last_7_days", label: "Last 7 days" },
  { id: "this_month", label: "This Month" },
  { id: "previous_month", label: "Previous Month" },
  { id: "date", label: "By Date" },
  { id: "month", label: "By Month" },
];
const STAFF_TRANSACTION_TYPE_OPTIONS = [
  { id: "all", label: "All Types" },
  { id: "salary", label: "Salary" },
  { id: "advance", label: "Advance" },
  { id: "repayment", label: "Advance Return" },
  { id: "manual", label: "Manual" },
];
const ATTENDANCE_STATUS_META = {
  present: { label: "Present", short: "P", tone: "green" },
  absent: { label: "Absent", short: "A", tone: "rose" },
  half_day: { label: "Half Day", short: "HD", tone: "amber" },
  paid_leave: { label: "Paid Leave", short: "PL", tone: "blue" },
  short_leave: { label: "Short Leave", short: "SL", tone: "violet" },
  weekly_off: { label: "Weekly Off", short: "WO", tone: "slate" },
};
const ATTENDANCE_MARK_OPTIONS = [
  ["present", "P"],
  ["absent", "A"],
];
const COUNTRY_OPTIONS = Country.getAllCountries();

const emptyDepartment = {
  name: "",
  description: "",
  weeklyOffDays: [0],
  shift: { name: "General", start: "09:00", end: "18:00", breakMinutes: 60 },
  leavePolicy: { paidLeaves: 0, shortLeaves: 0 },
  superAdmin: null,
};

const emptyStaff = {
  employeeCode: "",
  name: "",
  email: "",
  phone: "",
  addressCountry: "IN",
  addressState: "",
  addressCity: "",
  houseAddress: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  ifscCode: "",
  branch: "",
  upiId: "",
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
  lockedStaff: false,
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
  if (scope?.startsWith("monthly:")) return "Monthly";
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

function payrollMonthFromDueDateForStaff(staff, dueDate = localDate()) {
  const basis = normalizeSalaryBasisValue(staff?.salaryBasis);
  if (basis === "daily" || basis === "hourly") return (dueDate || localDate()).slice(0, 7);
  const due = parseDateValue(payrollDueDateFromValue(staffPayrollCycleDay(staff), dueDate || localDate()));
  due.setMonth(due.getMonth() - 1);
  return localDate(due).slice(0, 7);
}

function payrollSalaryMonthForStaff(staff, payroll, fallbackMonth = localDate().slice(0, 7)) {
  if (payroll?.periodEnd) return payrollMonthFromDueDateForStaff(staff, payroll.periodEnd);
  if (payroll?.month) return payroll.month;
  return fallbackMonth;
}

function payrollDueDateFromSalaryMonth(staff, month = localDate().slice(0, 7)) {
  const basis = normalizeSalaryBasisValue(staff?.salaryBasis);
  if (basis === "daily" || basis === "hourly") return `${month}-01`;
  const [year, monthIndex] = (month || localDate().slice(0, 7)).split("-").map(Number);
  const due = new Date(year, monthIndex, staffPayrollCycleDay(staff));
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

function isPayrollPayable(payroll, referenceDate = localDate()) {
  if (!payroll) return false;
  const basis = normalizeSalaryBasisValue(payroll.salaryBasis || payroll.staff?.salaryBasis);
  const today = referenceDate || localDate();
  if (basis === "daily" || basis === "hourly") {
    return (payroll.periodEnd || payroll.periodStart || "") <= today;
  }
  if (payroll.periodEnd) {
    const lastSalaryDate = localDate(addCalendarDays(parseDateValue(payroll.periodEnd), -1));
    return lastSalaryDate <= today;
  }
  return (payroll.month || "") < today.slice(0, 7);
}

function idOf(item) {
  return (item?._id || item?.id || "").toString();
}

function formatSlipMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatSlipDate(value) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(value);
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function safeFilePart(value) {
  return String(value || "salary-slip").replace(/[^a-z0-9-]+/gi, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function organizationNameFromTitle() {
  if (typeof document === "undefined") return "";
  const title = document.title || "";
  const name = title.split(" - ")[0]?.trim();
  if (!name || ["dashboard", "whatsapp"].includes(name.toLowerCase())) return "";
  return name;
}

function organizationNameFromSession() {
  if (typeof localStorage === "undefined") return "";
  try {
    const ownerSession = JSON.parse(localStorage.getItem("ownerSession") || "{}");
    const ownerUser = JSON.parse(ownerSession.user || "{}");
    return ownerUser.organizationName || ownerUser.organization?.name || ownerUser.companyName || "";
  } catch {
    return "";
  }
}

function amountToIndianWords(value) {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const belowHundred = (num) => num < 20 ? ones[num] : [tens[Math.floor(num / 10)], ones[num % 10]].filter(Boolean).join("-");
  const belowThousand = (num) => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return [hundred ? `${ones[hundred]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
  };
  const rounded = Math.round(Number(value || 0));
  if (rounded <= 0) return "Zero";
  const parts = [
    [Math.floor(rounded / 10000000), "Crore"],
    [Math.floor((rounded % 10000000) / 100000), "Lakh"],
    [Math.floor((rounded % 100000) / 1000), "Thousand"],
    [rounded % 1000, ""],
  ];
  return parts
    .filter(([num]) => num > 0)
    .map(([num, label]) => `${belowThousand(num)}${label ? ` ${label}` : ""}`)
    .join(" ");
}

function formatMoney(value) {
  return `₹ ${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number(value || 0) % 1 ? 2 : 0,
  })}`;
}

function payrollCameDays(payroll) {
  return Number(payroll?.cameDays ?? (
    Number(payroll?.presentDays || 0)
    + Number(payroll?.halfDays || 0)
    + Number(payroll?.shortLeaveDays || 0)
  ));
}

function payrollNeedsLoanSettlement(payroll) {
  return payroll
    && Number(payroll.loanDeduction || 0) > 0
    && Number(payroll.balanceDue ?? payroll.netPay ?? 0) <= 0
    && !payroll.loanRepaymentApplied;
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
    salary_prepayment: "Salary payment",
    manual_out: "Payment out",
    manual_in: "Payment in",
    loan_out: "Employee advance paid",
    loan_repayment: "Advance repayment",
    advance_out: "Advance paid",
  };
  return titles[transaction?.type] || "Bank transaction";
}

function staffTransactionTitle(transaction) {
  const titles = {
    salary: "Salary received",
    salary_prepayment: "Salary received",
    loan_out: "Advance received",
    advance_out: "Advance received",
    loan_repayment: "Advance repayment",
    manual_in: "Payment made",
    manual_out: "Payment received",
  };
  return titles[transaction?.type] || transactionTitle(transaction);
}

function staffTransactionDirection(transaction) {
  if (["salary", "salary_prepayment", "loan_out", "advance_out", "manual_out"].includes(transaction?.type)) return "in";
  if (["loan_repayment", "manual_in"].includes(transaction?.type)) return "out";
  return transactionDirection(transaction);
}

function staffTransactionTypeKey(transaction) {
  if (["salary", "salary_prepayment"].includes(transaction?.type)) return "salary";
  if (["loan_out", "advance_out"].includes(transaction?.type)) return "advance";
  if (transaction?.type === "loan_repayment") return "repayment";
  return "manual";
}

function repaymentKindLabel(item) {
  return "Advance";
}

function dayLabels(days = []) {
  if (!days.length) return "No weekly off";
  return days.map((day) => DAY_OPTIONS.find((item) => item.id === Number(day))?.label).filter(Boolean).join(", ");
}

function staffLabel(staff) {
  if (!staff) return "Staff";
  return [staff.name, staff.employeeCode].filter(Boolean).join(" - ");
}

function staffHasBankDetails(staff) {
  return ["bankName", "accountHolderName", "accountNumber", "ifscCode", "branch", "upiId"]
    .some((field) => String(staff?.[field] || "").trim());
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

function addDaysToLocalDate(value, days) {
  const next = parseDateValue(value || localDate());
  next.setDate(next.getDate() + days);
  return localDate(next);
}

function rangeForTransactionFilter(filter = {}) {
  const today = localDate();
  const selectedDate = filter.date || today;
  const selectedMonth = filter.month || today.slice(0, 7);
  if (filter.mode === "all") return null;
  if (filter.mode === "date") return { start: selectedDate, end: selectedDate };
  if (filter.mode === "month") {
    const monthDates = datesInMonth(selectedMonth);
    return { start: monthDates[0], end: monthDates[monthDates.length - 1] };
  }
  if (filter.mode === "today") return { start: today, end: today };
  if (filter.mode === "yesterday") {
    const yesterday = addDaysToLocalDate(today, -1);
    return { start: yesterday, end: yesterday };
  }
  if (filter.mode === "last_7_days") return { start: addDaysToLocalDate(today, -6), end: today };
  if (filter.mode === "this_month") {
    const monthDates = datesInMonth(today.slice(0, 7));
    return { start: monthDates[0], end: monthDates[monthDates.length - 1] };
  }
  if (filter.mode === "previous_month") {
    const previous = shiftMonth(today.slice(0, 7), -1);
    const monthDates = datesInMonth(previous);
    return { start: monthDates[0], end: monthDates[monthDates.length - 1] };
  }
  const startOfWeek = addDaysToLocalDate(today, -parseDateValue(today).getDay());
  if (filter.mode === "this_week") return { start: startOfWeek, end: addDaysToLocalDate(startOfWeek, 6) };
  if (filter.mode === "last_week") {
    const start = addDaysToLocalDate(startOfWeek, -7);
    return { start, end: addDaysToLocalDate(start, 6) };
  }
  return null;
}

function transactionMatchesDateRange(transaction, filter) {
  const range = rangeForTransactionFilter(filter);
  if (!range) return true;
  if (!transaction?.paidAt) return false;
  const txDate = localDate(new Date(transaction.paidAt));
  return txDate >= range.start && txDate <= range.end;
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

function monthlySalaryDaysForCycle(dueDate, cycleDay) {
  const safeCycleDay = normalizePayrollCycleDay(cycleDay, 1);
  const period = buildPayrollPeriod(payrollDueDateFromValue(safeCycleDay, dueDate || localDate()), safeCycleDay);
  return period.dates.length || datesInMonth((dueDate || localDate()).slice(0, 7)).length;
}

function estimateHourlyRateForStaff(person, referenceDate = localDate()) {
  const basis = normalizeSalaryBasisValue(person?.salaryBasis);
  const salary = Number(person?.monthlySalary || 0);
  const dailyHours = Math.max(0, Number(person?.expectedHoursPerDay || 0)) || 8;
  if (basis === "hourly") return salary;
  if (basis === "daily") return dailyHours > 0 ? salary / dailyHours : 0;
  const dueDate = monthlyDueDateForWorkDate(referenceDate, staffPayrollCycleDay(person));
  const salaryDays = monthlySalaryDaysForCycle(dueDate, staffPayrollCycleDay(person));
  return salaryDays > 0 ? salary / (salaryDays * dailyHours) : 0;
}

export default function HRPage() {
  const router = useRouter();
  const [currentUserRole] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      return localStorage.getItem("role") || storedUser.role || "";
    } catch {
      return localStorage.getItem("role") || "";
    }
  });
  const [currentHrPermissions] = useState(() => {
    if (typeof window === "undefined") return normalizeHrPermissions();
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      return normalizeHrPermissions(storedUser.hrPermissions);
    } catch {
      return normalizeHrPermissions();
    }
  });
  const [active, setActive] = useState("staff-payroll");
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
  const [staffTxnFilter, setStaffTxnFilter] = useState({ mode: "all", date: localDate(), month: localDate().slice(0, 7), type: "all" });
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
  const [staffBankDetailsOpen, setStaffBankDetailsOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState("");
  const [bankForm, setBankForm] = useState(emptyBank);
  const [loanForm, setLoanForm] = useState(emptyLoan);
  const [selfMonth, setSelfMonth] = useState("");
  const [selfHr, setSelfHr] = useState(null);

  const isRegularHrUser = currentUserRole === "user";
  const hasFullHrAccess = ["super_to_super_admin", "super_admin"].includes(currentUserRole);
  const canHr = useCallback(
    (permission) => hasFullHrAccess || normalizeHrPermissions(currentHrPermissions)[permission] === true,
    [currentHrPermissions, hasFullHrAccess]
  );
  const visibleHrTabs = useMemo(
    () => HR_MAIN_TABS.filter((tab) => tab.id !== "banks-loans" || canHr("canViewBanks") || canHr("canManageAdvances")),
    [canHr]
  );

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
    const counts = { present: 0, absent: 0, half_day: 0, paid_leave: 0, short_leave: 0, weekly_off: 0 };
    activeStaff.forEach((person) => {
      const record = attendanceByStaff.get(idOf(person));
      if (record?.status === "present") counts.present += 1;
      else if (record?.status === "absent") counts.absent += 1;
      else if (record?.status === "half_day") counts.half_day += 1;
      else if (record?.status === "paid_leave") counts.paid_leave += 1;
      else if (record?.status === "short_leave") counts.short_leave += 1;
      else if (record?.status === "weekly_off") counts.weekly_off += 1;
    });
    return counts;
  }, [activeStaff, attendanceByStaff]);

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
      if (item.status !== "paid" && isPayrollPayable(item)) acc.dues += Number(item.balanceDue ?? item.netPay ?? 0);
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
      .filter((item) => (
        item.status !== "paid"
        && isPayrollPayable(item)
        && (Number(item.balanceDue ?? item.netPay ?? 0) > 0 || payrollNeedsLoanSettlement(item))
      ))
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

  const staffAccruedSummaryByStaff = useMemo(() => {
    const map = new Map();
    payrolls
      .filter((item) => item.status !== "paid" && Number(item.balanceDue ?? item.netPay ?? 0) > 0)
      .forEach((item) => {
        const staffId = idOf(item.staff);
        const current = map.get(staffId) || { amount: 0, payrolls: [] };
        current.amount += Number(item.balanceDue ?? item.netPay ?? 0);
        current.payrolls.push(item);
        map.set(staffId, current);
      });
    map.forEach((summary) => {
      summary.payrolls.sort((a, b) => new Date(a.periodEnd || a.createdAt || 0) - new Date(b.periodEnd || b.createdAt || 0));
      summary.payroll = summary.payrolls[0] || null;
    });
    return map;
  }, [payrolls]);

  const selectedPayroll = useMemo(
    () => {
      if (!selectedDetailStaff) return null;
      const selectedId = idOf(selectedDetailStaff);
      const selectedMonth = selectedDetailUsesSingleDay ? detailDate.slice(0, 7) : detailMonth;
      return payrolls.find((item) => (
        idOf(item.staff) === selectedId
        && payrollMatchesScope(item, payrollScopeForStaff(selectedDetailStaff))
        && payrollSalaryMonthForStaff(selectedDetailStaff, item, selectedMonth) === selectedMonth
      ))
        || payrollByStaff.get(selectedId)
        || payrolls.find((item) => idOf(item.staff) === selectedId && item.periodEnd === currentPayrollDueDate && payrollMatchesScope(item, payrollScope))
        || null;
    },
    [currentPayrollDueDate, detailDate, detailMonth, payrollByStaff, payrolls, payrollScope, selectedDetailStaff, selectedDetailUsesSingleDay]
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
    const counts = { present: 0, absent: 0, half_day: 0, paid_leave: 0, short_leave: 0, weekly_off: 0 };
    if (!selectedDetailStaff) return counts;
    const summaryDates = selectedDetailUsesSingleDay ? [detailDate] : datesInMonth(detailMonth);
    summaryDates.forEach((date) => {
      const record = detailAttendanceByDate.get(date);
      if (record?.status === "present") counts.present += 1;
      else if (record?.status === "absent") counts.absent += 1;
      else if (record?.status === "half_day") counts.half_day += 1;
      else if (record?.status === "paid_leave") counts.paid_leave += 1;
      else if (record?.status === "short_leave") counts.short_leave += 1;
      else if (record?.status === "weekly_off") counts.weekly_off += 1;
    });
    return counts;
  }, [detailAttendanceByDate, detailDate, detailMonth, selectedDetailStaff, selectedDetailUsesSingleDay]);

  const selectedStaffTransactions = useMemo(() => {
    if (!selectedDetailStaff) return [];
    const selectedId = idOf(selectedDetailStaff);
    return bankTransactions.filter((t) => idOf(t.staff) === selectedId);
  }, [bankTransactions, selectedDetailStaff]);

  const filteredSelectedStaffTransactions = useMemo(() => (
    selectedStaffTransactions.filter((transaction) => {
      if (!transactionMatchesDateRange(transaction, staffTxnFilter)) return false;
      if (staffTxnFilter.type === "all") return true;
      return staffTransactionTypeKey(transaction) === staffTxnFilter.type;
    })
  ), [selectedStaffTransactions, staffTxnFilter]);

  const filteredStaffTransactionTotals = useMemo(() => (
    filteredSelectedStaffTransactions.reduce((totals, transaction) => {
      const amount = Number(transaction.amount || 0);
      if (staffTransactionDirection(transaction) === "in") totals.in += amount;
      else totals.out += amount;
      return totals;
    }, { in: 0, out: 0 })
  ), [filteredSelectedStaffTransactions]);

  const activeLoans = useMemo(
    () => loans.filter((loan) => loan.category === "advance" && loan.status === "active" && Number(loan.outstanding || 0) > 0),
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
      .filter((payroll) => (
        idOf(payroll.staff) === bankPaymentForm.staff
        && payroll.status !== "paid"
        && isPayrollPayable(payroll)
        && (Number(payroll.balanceDue ?? payroll.netPay ?? 0) > 0 || payrollNeedsLoanSettlement(payroll))
      ))
      .sort((a, b) => new Date(a.periodEnd || a.createdAt || 0) - new Date(b.periodEnd || b.createdAt || 0));
  }, [bankPaymentForm.staff, payrolls]);

  const selectedPaymentPayroll = useMemo(() => (
    selectedPaymentPayrolls.find((payroll) => idOf(payroll) === bankPaymentForm.payroll) || null
  ), [bankPaymentForm.payroll, selectedPaymentPayrolls]);

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
      hasLoanBalance: Boolean(t.loan || ["advance_out", "loan_out", "loan_repayment"].includes(t.type)),
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
      acc.advance += Number(item.outstanding || 0);
      acc.deduction += Number(item.emi || 0);
      acc.count += 1;
      return acc;
    }, { loan: 0, advance: 0, deduction: 0, count: 0 }),
    [activeLoans]
  );

  const pendingAdvanceDeductionsByStaff = useMemo(() => {
    const map = new Map();
    payrolls.forEach((payroll) => {
      const deduction = Number(payroll.loanDeduction || 0);
      if (deduction <= 0 || payroll.loanRepaymentApplied) return;
      const staffId = idOf(payroll.staff);
      map.set(staffId, Number(map.get(staffId) || 0) + deduction);
    });
    return map;
  }, [payrolls]);

  const receivableByStaff = useMemo(() => {
    const map = new Map();
    activeLoans.forEach((item) => {
      const staffId = idOf(item.staff);
      const current = map.get(staffId) || { amount: 0, loan: 0, advance: 0, count: 0 };
      const outstanding = Number(item.outstanding || 0);
      current.amount += outstanding;
      current.advance += outstanding;
      current.count += 1;
      map.set(staffId, current);
    });
    map.forEach((summary, staffId) => {
      const pendingDeduction = Number(pendingAdvanceDeductionsByStaff.get(staffId) || 0);
      summary.pendingDeduction = pendingDeduction;
      summary.amount = Math.max(0, Number(summary.amount || 0) - pendingDeduction);
      summary.advance = Math.max(0, Number(summary.advance || 0) - pendingDeduction);
    });
    return map;
  }, [activeLoans, pendingAdvanceDeductionsByStaff]);

  const staffTableTotals = useMemo(() => {
    return activeStaff.reduce((acc, person) => {
      const staffId = idOf(person);
      const dueSummary = staffDueSummaryByStaff.get(staffId);
      const payroll = payrollByStaff.get(staffId);
      const salaryDue = dueSummary
        ? Number(dueSummary.amount || 0)
        : payroll?.status !== "paid" && isPayrollPayable(payroll) ? Number(payroll?.balanceDue ?? payroll?.netPay ?? 0) : 0;
      acc.salaryDue += Math.max(0, salaryDue);
      acc.receivable += Number(receivableByStaff.get(staffId)?.amount || 0);
      return acc;
    }, { salaryDue: 0, receivable: 0 });
  }, [activeStaff, payrollByStaff, receivableByStaff, staffDueSummaryByStaff]);

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
  const staffAddressStates = useMemo(
    () => State.getStatesOfCountry(staffForm.addressCountry || ""),
    [staffForm.addressCountry]
  );
  const staffAddressCities = useMemo(
    () => (staffForm.addressCountry && staffForm.addressState
      ? City.getCitiesOfState(staffForm.addressCountry, staffForm.addressState)
      : []),
    [staffForm.addressCountry, staffForm.addressState]
  );
  const selectedAddressCountry = useMemo(
    () => COUNTRY_OPTIONS.find((country) => country.isoCode === staffForm.addressCountry) || null,
    [staffForm.addressCountry]
  );
  const selectedAddressState = useMemo(
    () => staffAddressStates.find((state) => state.isoCode === staffForm.addressState) || null,
    [staffAddressStates, staffForm.addressState]
  );
  const selectedAddressCity = useMemo(
    () => staffAddressCities.find((city) => city.name === staffForm.addressCity) || null,
    [staffAddressCities, staffForm.addressCity]
  );

  const staffSalaryPreview = useMemo(() => {
    const amount = Number(staffForm.monthlySalary || 0);
    const dailyHours = Math.max(0, Number(staffForm.expectedHoursPerDay || 0)) || 8;
    const basis = normalizeSalaryBasisValue(staffForm.salaryBasis);
    const cycleDay = normalizePayrollCycleDay(staffForm.payrollCycleDay || cycleStartDay, cycleStartDay);
    const monthlyDueDate = monthlyDueDateForWorkDate(attendanceDate || localDate(), cycleDay);
    const monthlyWorkingDays = monthlyWorkingDaysForDepartment(selectedStaffFormDepartment, monthlyDueDate, cycleDay);
    const monthlySalaryDays = monthlySalaryDaysForCycle(monthlyDueDate, cycleDay);

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

    const daily = monthlySalaryDays > 0 ? amount / monthlySalaryDays : 0;
    return [
      { label: "Month days", value: `${monthlySalaryDays} days`, plain: true },
      { label: "Daily salary", value: daily },
      { label: "Hourly salary", value: daily / dailyHours },
    ];
  }, [attendanceDate, cycleStartDay, selectedStaffFormDepartment, staffForm.expectedHoursPerDay, staffForm.monthlySalary, staffForm.payrollCycleDay, staffForm.salaryBasis]);

  const showNotice = useCallback((type, text) => setNotice({ type, text }), []);

  const loadAll = useCallback(async () => {
    if (isRegularHrUser) return;
    setLoading(true);
    try {
      const payrollBasis = payrollScopeBasis(payrollScope);
      const payrollCycleQuery = payrollBasis === "monthly" ? `&cycleStartDay=${payrollScopeCycleDay(payrollScope, cycleStartDay)}` : "";
      const canViewBanks = canHr("canViewBanks");
      const canLoadBanks = canViewBanks || canHr("canManageBanks") || canHr("canMakePayments");
      const canViewAdvances = canHr("canManageAdvances");
      const [summaryRes, departmentsRes, staffRes, attendanceRes, banksRes, bankTransactionsRes, loansRes, payrollRes, openPayrollRes] = await Promise.all([
        API.get("/hr/summary"),
        API.get("/hr/departments"),
        API.get("/hr/staff"),
        API.get(`/hr/attendance?date=${attendanceDate}`),
        canLoadBanks ? API.get("/hr/banks") : Promise.resolve({ data: { data: [] } }),
        canViewBanks ? API.get("/hr/banks/transactions") : Promise.resolve({ data: { data: [] } }),
        canViewAdvances ? API.get("/hr/loans") : Promise.resolve({ data: { data: [] } }),
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
  }, [attendanceDate, canHr, cycleStartDay, isRegularHrUser, payrollDueDate, payrollScope, showNotice]);

  const loadSelfHr = useCallback(async () => {
    if (!isRegularHrUser) return;
    setLoading(true);
    try {
      const res = await API.get(`/hr/me${selfMonth ? `?month=${selfMonth}` : ""}`);
      const data = res.data?.data || null;
      setSelfHr(data);
      if (data?.month && data.month !== selfMonth) setSelfMonth(data.month);
      setStaff(data?.staff ? [data.staff] : []);
      setPayrolls(data?.payrolls || []);
      setBankTransactions(data?.bankTransactions || []);
      setDetailAttendance(data?.attendance || []);
    } catch (error) {
      setSelfHr(null);
      setBankTransactions([]);
      showNotice("error", error.response?.data?.error || "Could not load your HR details.");
    } finally {
      setLoading(false);
    }
  }, [isRegularHrUser, selfMonth, showNotice]);

  useEffect(() => {
    if (isRegularHrUser) loadSelfHr();
    else loadAll();
  }, [isRegularHrUser, loadAll, loadSelfHr]);

  useEffect(() => {
    if (!visibleHrTabs.some((tab) => tab.id === active)) {
      setActive(visibleHrTabs[0]?.id || "staff-payroll");
    }
  }, [active, visibleHrTabs]);

  useEffect(() => {
    if (detailTab === "transactions" && !canHr("canViewBanks")) setDetailTab("attendance");
  }, [canHr, detailTab]);

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      if (isRegularHrUser) return;
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
  }, [isRegularHrUser]);

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

  const mergePayrolls = useCallback((items = []) => {
    setPayrolls((prev) => {
      const payrollKey = (item) => `${idOf(item.staff)}:${item.periodEnd || ""}:${normalizeSalaryBasisValue(item.salaryBasis || item.staff?.salaryBasis)}`;
      const nextByStaff = new Map(prev.map((item) => [payrollKey(item), item]));
      items.forEach((item) => nextByStaff.set(payrollKey(item), item));
      return Array.from(nextByStaff.values());
    });
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      const res = await API.get("/hr/summary");
      setSummary(res.data?.data || null);
    } catch { /* non-blocking */ }
  }, []);

  const openStaffDetail = (person, tab = "attendance") => {
    const baseDate = attendanceDate || localDate();
    const nextScope = payrollScopeForStaff(person);
    const payrollMonth = baseDate.slice(0, 7);
    setDetailStaffId(idOf(person));
    setDetailTab(tab);
    setDetailDate(baseDate);
    setDetailMonth(payrollMonth);
    setPayrollScope(nextScope);
    setPayrollDueDate(normalizePayrollDateForScope(payrollDueDateForStaff(person, baseDate), nextScope));
    if (tab === "payroll") {
      generatePayrollForStaffMonth(person, payrollMonth, { date: usesSingleDayAttendance(person) ? baseDate : undefined, syncSelectedDate: true });
    }
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
    return staffBalanceSummary(person).amount;
  };

  const staffBalanceSummary = (person) => {
    const staffId = idOf(person);
    const dueSummary = staffDueSummaryByStaff.get(staffId);
    const accruedSummary = staffAccruedSummaryByStaff.get(staffId);
    const payroll = payrollByStaff.get(staffId);
    const salaryDue = dueSummary
      ? Number(dueSummary.amount || 0)
      : payroll?.status !== "paid" && isPayrollPayable(payroll) ? Number(payroll?.balanceDue ?? payroll?.netPay ?? 0) : 0;
    const salaryAccrued = accruedSummary ? Number(accruedSummary.amount || 0) : 0;
    const receivable = receivableByStaff.get(staffId) || { amount: 0, loan: 0, advance: 0, count: 0 };
    const advanceCut = Number(receivable.amount || 0);
    if (salaryDue > 0) {
      const netPayable = salaryDue - advanceCut;
      return {
        amount: Math.abs(netPayable),
        rawSalary: salaryDue,
        advanceCut,
        type: netPayable > 0 ? "salary_due" : netPayable < 0 ? "receivable" : "settled",
        receivable,
      };
    }
    if (salaryAccrued > 0) {
      const netPayable = salaryAccrued - advanceCut;
      return {
        amount: Math.abs(netPayable),
        rawSalary: salaryAccrued,
        advanceCut,
        type: netPayable > 0 ? "salary_accrued" : netPayable < 0 ? "receivable" : "settled",
        receivable,
      };
    }
    return { amount: Number(receivable.amount || 0), type: "receivable", receivable };
  };

  const staffReceivableSummary = (person) => {
    return receivableByStaff.get(idOf(person)) || { amount: 0, loan: 0, advance: 0, count: 0 };
  };

  const generatePayrollForStaffMonth = useCallback(async (person, month, options = {}) => {
    if (!canHr("canGenerateSalarySlip")) return [];
    const basis = normalizeSalaryBasisValue(person.salaryBasis);
    const safeMonth = month || localDate().slice(0, 7);
    const nextScope = payrollScopeForStaff(person);
    const dueDate = basis === "monthly"
      ? payrollDueDateFromSalaryMonth(person, safeMonth)
      : options.date || `${safeMonth}-01`;
    try {
      const res = await API.post("/hr/payroll/generate", {
        dueDate,
        cycleStartDay: staffPayrollCycleDay(person),
        salaryBasis: basis,
        staff: idOf(person),
      });
      mergePayrolls(res.data?.data || []);
      if (options.syncSelectedDate) {
        setPayrollScope(nextScope);
        setPayrollDueDate(normalizePayrollDateForScope(dueDate, nextScope));
      }
      refreshSummary();
      return res.data?.data || [];
    } catch {
      // Attendance save should stay successful even if payroll refresh is not due yet.
      return [];
    }
  }, [canHr, mergePayrolls, refreshSummary]);

  const refreshDuePayrollForStaff = useCallback(async (person, date, options = {}) => {
    if (!date || date > localDate()) return [];
    return generatePayrollForStaffMonth(person, date.slice(0, 7), { ...options, date });
  }, [generatePayrollForStaffMonth]);

  const openDetailTab = (tab) => {
    if (tab === "payroll" && selectedDetailStaff) {
      const month = usesSingleDayAttendance(selectedDetailStaff) ? detailDate.slice(0, 7) : detailMonth;
      changeDetailPayrollMonth(month);
      generatePayrollForStaffMonth(selectedDetailStaff, month, { date: usesSingleDayAttendance(selectedDetailStaff) ? detailDate : undefined, syncSelectedDate: true });
    }
    setDetailTab(tab);
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
        name: departmentForm.name,
        description: departmentForm.description,
        shift: departmentForm.shift,
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
    if (!canHr(editingStaffId ? "canEditStaff" : "canAddStaff")) {
      return showNotice("error", "You do not have permission to save staff.");
    }
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
        address: {
          countryCode: staffForm.addressCountry || "",
          countryName: selectedAddressCountry?.name || "",
          stateCode: staffForm.addressState || "",
          stateName: selectedAddressState?.name || "",
          cityName: selectedAddressCity?.name || staffForm.addressCity || "",
          houseAddress: staffForm.houseAddress || "",
        },
      };
      const res = editingStaffId ? await API.patch(`/hr/staff/${editingStaffId}`, payload) : await API.post("/hr/staff", payload);
      const saved = res.data.data;
      setStaff((prev) => editingStaffId ? prev.map((item) => (idOf(item) === editingStaffId ? saved : item)) : [saved, ...prev]);
      setStaffForm({ ...emptyStaff, payrollCycleDay: cycleStartDay });
      setStaffBankDetailsOpen(false);
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
    if (!canHr("canEditStaff")) {
      return showNotice("error", "You do not have permission to edit staff.");
    }
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
    if (!canHr("canDeleteStaff")) {
      return showNotice("error", "You do not have permission to delete staff.");
    }
    const staffId = idOf(person);
    if (!window.confirm(`Delete ${person.name}? This will also delete their attendance, payroll, and advance records.`)) return;
    try {
      await API.delete(`/hr/staff/${staffId}`);
      setStaff((prev) => prev.filter((item) => idOf(item) !== staffId));
      setAttendance((prev) => prev.filter((item) => idOf(item.staff) !== staffId));
      setPayrolls((prev) => prev.filter((item) => idOf(item.staff) !== staffId));
      setBankTransactions((prev) => prev.filter((item) => idOf(item.staff) !== staffId));
      setLoans((prev) => prev.filter((item) => idOf(item.staff) !== staffId));
      if (editingStaffId === staffId) { setEditingStaffId(""); setStaffForm(emptyStaff); setStaffBankDetailsOpen(false); }
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
    if (!canHr("canMarkAttendance")) {
      return showNotice("error", "You do not have permission to mark attendance.");
    }
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
      await refreshDuePayrollForStaff(person, attendanceDate, { syncSelectedDate: idOf(person) === detailStaffId });
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not mark attendance.");
    }
  };

  const updateDetailAttendanceDraft = (date, field, value) => {
    setDetailAttendanceDrafts((prev) => ({ ...prev, [date]: { ...(prev[date] || {}), [field]: value } }));
  };

  const saveDetailAttendanceDraft = async (person, date, overrides = {}) => {
    if (!canHr("canMarkAttendance")) {
      showNotice("error", "You do not have permission to mark attendance.");
      return;
    }
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
      const draftWorkHours = Number(draft.workHours || 0);
      if (status === "present" && draftWorkHours <= 0 && (!checkIn || !checkOut)) {
        showNotice("error", "Enter work hours for hourly staff.");
        setDetailAttendanceDrafts((prev) => ({ ...prev, [date]: { ...draft, status, checkIn, checkOut } }));
        return;
      }
      workHours = draftWorkHours > 0 ? draftWorkHours : checkIn && checkOut ? calculateWorkHours(checkIn, checkOut) : defaultStatusHours;
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
      await refreshDuePayrollForStaff(person, date, { syncSelectedDate: idOf(person) === detailStaffId });
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
    updateDetailAttendanceDraft(date, "status", action);
    await saveDetailAttendanceDraft(person, date, {
      status: action,
      ...(action === "weekly_off" ? { checkIn: "", checkOut: "", workHours: 0 } : {}),
    });
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
    if (!canHr("canManageBanks")) return showNotice("error", "You do not have permission to manage banks.");
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
    const lockedStaff = Boolean(defaults.lockedStaff || staffId);
    const firstPayroll = staffId
      ? payrolls
        .filter((payroll) => idOf(payroll.staff) === staffId && payroll.status !== "paid" && isPayrollPayable(payroll) && (Number(payroll.balanceDue ?? payroll.netPay ?? 0) > 0 || payrollNeedsLoanSettlement(payroll)))
        .sort((a, b) => new Date(a.periodEnd || a.createdAt || 0) - new Date(b.periodEnd || b.createdAt || 0))[0]
      : null;
    const purpose = defaults.purpose || (defaults.direction === "in" ? "general" : "salary");
    const amount = defaults.amount ?? (purpose === "salary" && firstPayroll ? (firstPayroll.balanceDue ?? firstPayroll.netPay ?? "") : "");
    setPayNowBank(targetBank || {});
    setBankPaymentForm({
      ...emptyBankPayment,
      bankId: idOf(targetBank) || idOf(banks[0]) || "",
      direction: defaults.direction || "out",
      partyType: staffId ? "employee" : defaults.partyType || "employee",
      purpose,
      lockedStaff,
      staff: staffId,
      loan: defaults.loan || "",
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
    if (!canHr("canManageBanks")) return showNotice("error", "You do not have permission to add money to banks.");
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
    if (!canHr("canMakePayments")) return showNotice("error", "You do not have permission to make payments.");
    if (!payNowBank) return;
    const bankId = bankPaymentForm.bankId || idOf(selectedPaymentBank);
    if (!bankId) return showNotice("error", "Add or select a bank first.");
    const isZeroSalarySettlement = bankPaymentForm.partyType === "employee"
      && bankPaymentForm.direction === "out"
      && bankPaymentForm.purpose === "salary"
      && bankPaymentForm.payroll
      && payrollNeedsLoanSettlement(selectedPaymentPayroll);
    if (Number(bankPaymentForm.amount || 0) <= 0 && !isZeroSalarySettlement) return showNotice("error", "Enter an amount greater than zero.");
    if (bankPaymentForm.partyType === "employee" && !bankPaymentForm.staff) return showNotice("error", "Select an employee.");
    if (
      bankPaymentForm.partyType === "employee"
      && bankPaymentForm.direction === "out"
      && bankPaymentForm.purpose === "loan"
    ) {
      return showNotice("error", "Loan payments are disabled. Use Advance instead.");
    }
    if (bankPaymentForm.partyType === "other" && !bankPaymentForm.beneficiaryName.trim()) {
      return showNotice("error", bankPaymentForm.direction === "in" ? "Sender name is required." : "Receiver name is required.");
    }
    if (
      bankPaymentForm.partyType === "employee"
      && bankPaymentForm.direction === "in"
      && bankPaymentForm.purpose === "advance_repayment"
      && !bankPaymentForm.loan
    ) {
      return showNotice("error", "Select the advance being returned.");
    }
    if (
      bankPaymentForm.partyType === "employee"
      && (
        (bankPaymentForm.direction === "out" && bankPaymentForm.purpose === "advance")
        || (bankPaymentForm.direction === "in" && bankPaymentForm.purpose === "advance_repayment")
      )
      && !canHr("canManageAdvances")
    ) {
      return showNotice("error", "You do not have permission to manage advances.");
    }
    setSaving(true);
    try {
      if (bankPaymentForm.partyType === "employee" && bankPaymentForm.direction === "out" && bankPaymentForm.purpose === "salary" && bankPaymentForm.payroll) {
        const res = await API.post(`/hr/payroll/${bankPaymentForm.payroll}/pay`, {
          bankId,
          amount: Number(bankPaymentForm.amount || 0),
          note: bankPaymentForm.note,
        });
        setPayrolls((prev) => prev.map((item) => (idOf(item) === idOf(bankPaymentForm.payroll) ? res.data.data : item)));
        if (res.data.bank) setBanks((prev) => prev.map((item) => (idOf(item) === idOf(res.data.bank) ? res.data.bank : item)));
        if (canHr("canManageAdvances")) {
          const loansRes = await API.get("/hr/loans");
          setLoans(loansRes.data?.data || []);
        }
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
        salaryMonth: localDate().slice(0, 7),
        loan: bankPaymentForm.direction === "in" && bankPaymentForm.purpose === "advance_repayment"
          ? bankPaymentForm.loan
          : "",
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
    if (!canHr("canManageAdvances")) return showNotice("error", "You do not have permission to manage advances.");
    if (!loanForm.staff) return showNotice("error", "Select staff for the advance.");
    if (Number(loanForm.amount || 0) <= 0) return showNotice("error", "Advance amount must be greater than zero.");
    setSaving(true);
    try {
      const res = await API.post("/hr/loans", { ...loanForm, category: "advance", amount: Number(loanForm.amount), emi: Number(loanForm.amount) });
      setLoans((prev) => [res.data.data, ...prev]);
      if (res.data.payrolls?.length) mergePayrolls(res.data.payrolls);
      setLoanForm(emptyLoan);
      showNotice("success", "Advance added. It will cut from the next salary, and any balance carries forward.");
      if (toolsOpen === "loan") setToolsOpen("");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not save advance.");
    } finally {
      setSaving(false);
    }
  };

  const closeLoan = async (loan) => {
    if (!canHr("canManageAdvances")) return showNotice("error", "You do not have permission to manage advances.");
    try {
      const res = await API.patch(`/hr/loans/${idOf(loan)}`, { status: "closed", outstanding: 0 });
      setLoans((prev) => prev.map((item) => (idOf(item) === idOf(loan) ? res.data.data : item)));
      showNotice("success", "Advance closed.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not close advance.");
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
  const changeDetailPayrollMonth = (nextMonth) => {
    if (!selectedDetailStaff || !nextMonth) return;
    const nextScope = payrollScopeForStaff(selectedDetailStaff);
    setPayrollScope(nextScope);
    setPayrollDueDate(payrollDueDateFromSalaryMonth(selectedDetailStaff, nextMonth));
    generatePayrollForStaffMonth(selectedDetailStaff, nextMonth, { syncSelectedDate: true });
  };
  const stepDetailPayrollMonth = (direction) => {
    const currentMonth = selectedDetailStaff
      ? payrollMonthFromDueDateForStaff(selectedDetailStaff, payrollDueDate)
      : (payrollDueDate || localDate()).slice(0, 7);
    changeDetailPayrollMonth(shiftMonth(currentMonth, direction));
  };

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
    if (!canHr("canGenerateSalarySlip")) return showNotice("error", "You do not have permission to generate salary slips.");
    const payrollBasis = payrollScopeBasis(payrollScope);
    const day = payrollScopeCycleDay(payrollScope, cycleStartDay);
    if (payrollBasis === "monthly" && !PAYROLL_CYCLE_OPTIONS.includes(day)) return showNotice("error", "Payroll cycle must be 1 to 1, 7 to 7, or 15 to 15.");
    const dueDate = normalizePayrollDateForScope(payrollDueDate || localDate(), payrollScope);
    setPayrollDueDate(dueDate);
    setSaving(true);
    try {
      const res = await API.post("/hr/payroll/generate", { dueDate, cycleStartDay: day, salaryBasis: payrollBasis });
      mergePayrolls(res.data?.data || []);
      showNotice("success", "Payroll generated from attendance, weekly offs, and advance deduction.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not generate payroll.");
    } finally {
      setSaving(false);
    }
  };

  const generatePayrollForStaff = async (person) => {
    if (!canHr("canGenerateSalarySlip")) return showNotice("error", "You do not have permission to generate salary slips.");
    const payrollBasis = normalizeSalaryBasisValue(person.salaryBasis);
    const day = staffPayrollCycleDay(person);
    const nextScope = payrollScopeForStaff(person);
    setPayrollScope(nextScope);
    if (payrollBasis === "monthly" && !PAYROLL_CYCLE_OPTIONS.includes(day)) return showNotice("error", "Payroll cycle must be 1 to 1, 7 to 7, or 15 to 15.");
    const dueDate = normalizePayrollDateForScope(payrollDueDate || localDate(), nextScope);
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
    if (!canHr("canGenerateSalarySlip")) return showNotice("error", "You do not have permission to generate salary slips.");
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
    if (!canHr("canMakePayments")) return showNotice("error", "You do not have permission to make payments.");
    if (!clearDuePayroll) return;
    const bankId = paymentForm.bankId || banks[0]?._id;
    const isZeroSalarySettlement = Number(paymentForm.amount || 0) <= 0 && payrollNeedsLoanSettlement(clearDuePayroll);
    if (!bankId && !isZeroSalarySettlement) return showNotice("error", "Add or select a bank first.");
    try {
      const res = await API.post(`/hr/payroll/${idOf(clearDuePayroll)}/pay`, {
        bankId,
        amount: Number(paymentForm.amount || 0),
        note: paymentForm.note,
      });
      setPayrolls((prev) => prev.map((item) => (idOf(item) === idOf(clearDuePayroll) ? res.data.data : item)));
      if (res.data.bank) setBanks((prev) => prev.map((item) => (idOf(item) === idOf(res.data.bank) ? res.data.bank : item)));
      if (canHr("canManageAdvances")) {
        const loansRes = await API.get("/hr/loans");
        setLoans(loansRes.data?.data || []);
      }
      if (res.data.transaction) setBankTransactions((prev) => [res.data.transaction, ...prev]);
      else { const txRes = await API.get("/hr/banks/transactions"); setBankTransactions(txRes.data?.data || []); }
      setClearDuePayroll(null);
      showNotice("success", res.data.bank ? "Due cleared and bank balance reduced." : "Salary deduction settled.");
      refreshSummary();
    } catch (error) {
      showNotice("error", error.response?.data?.error || "Could not pay salary.");
    }
  };

  const makeStaffPayment = async (person) => {
    if (!canHr("canMakePayments")) return showNotice("error", "You do not have permission to make payments.");
    const dueSummary = staffDueSummaryByStaff.get(idOf(person));
    const payroll = dueSummary?.payroll || payrollByStaff.get(idOf(person));
    openBankPayment(selectedBankAccount, {
      staff: idOf(person),
      partyType: "employee",
      direction: "out",
      purpose: "salary",
      lockedStaff: true,
      payroll: payroll && payroll.status !== "paid" && isPayrollPayable(payroll) ? idOf(payroll) : "",
      amount: payroll && payroll.status !== "paid" && isPayrollPayable(payroll) ? (payroll.balanceDue ?? payroll.netPay ?? "") : "",
    });
  };

  const downloadSalarySlip = async () => {
    const staffMember = selectedDetailStaff;
    let payroll = selectedPayroll;
    if (!staffMember) return showNotice("error", "Select a staff member first.");
    const selectedSlipMonth = selectedDetailUsesSingleDay ? detailDate.slice(0, 7) : detailMonth;
    const payrollSlipMonth = payroll ? payrollSalaryMonthForStaff(staffMember, payroll, selectedSlipMonth) : "";
    if (!payroll || payrollSlipMonth !== selectedSlipMonth) {
      const generated = await generatePayrollForStaffMonth(staffMember, selectedSlipMonth, {
        date: selectedDetailUsesSingleDay ? detailDate : undefined,
        syncSelectedDate: true,
      });
      payroll = generated.find((item) => (
        idOf(item.staff) === idOf(staffMember)
        && payrollSalaryMonthForStaff(staffMember, item, selectedSlipMonth) === selectedSlipMonth
      )) || null;
    }
    if (!payroll) return showNotice("error", "Generate payroll for the selected month first, then download the salary slip.");

    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      storedUser = {};
    }
    if (!(storedUser.organizationName || storedUser.organization?.name)) {
      try {
        const meRes = await API.get("/users/me");
        const freshUser = meRes.data?.data || {};
        storedUser = {
          ...storedUser,
          ...freshUser,
          id: freshUser._id || freshUser.id || storedUser.id,
        };
        localStorage.setItem("user", JSON.stringify(storedUser));
      } catch {
        // Keep generating the slip with local data if the profile refresh is unavailable.
      }
    }

    const salaryBasis = normalizeSalaryBasisValue(payroll.salaryBasis || staffMember.salaryBasis);
    const periodDate = selectedSlipMonth
      ? parseDateValue(`${selectedSlipMonth}-01`)
      : payroll.periodEnd ? addCalendarDays(parseDateValue(payroll.periodEnd), -1) : payroll.month ? parseDateValue(`${payroll.month}-01`) : new Date();
    const monthLabel = periodDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    const payDate = payroll.paidAt || payroll.paymentHistory?.[payroll.paymentHistory.length - 1]?.paidAt || payroll.periodEnd || new Date();
    const companyName = storedUser.organizationName
      || storedUser.organization?.name
      || storedUser.companyName
      || organizationNameFromSession()
      || organizationNameFromTitle()
      || "Company Name";
    const companyAddress = storedUser.organizationAddress || storedUser.address || "India";
    const paidDays = salaryBasis === "hourly" ? `${Number(payroll.totalWorkHours || 0)} hrs` : Number(payroll.payableDays || payrollCameDays(payroll) || 0);
    const lopDays = Number(payroll.absentDays || 0) + Number(payroll.unpaidLeaveDays || 0);
    const baseSalary = Number(payroll.baseSalary ?? payroll.salaryAmount ?? staffMember.monthlySalary ?? 0);
    const totalDeductions = Number(payroll.attendanceDeduction || 0) + Number(payroll.loanDeduction || 0) + Number(payroll.fineAmount || 0);
    const overtimeAmount = Number(payroll.overtimeAmount || 0);
    const netPay = Number(payroll.netPay || Math.max(0, baseSalary + overtimeAmount - totalDeductions));
    const otherEarnings = Math.max(0, Number((netPay + totalDeductions - baseSalary - overtimeAmount).toFixed(2)));
    const grossEarnings = baseSalary + overtimeAmount + otherEarnings;
    const earningRows = [
      ["Basic", baseSalary],
      ...(overtimeAmount > 0 ? [["Overtime", overtimeAmount]] : []),
      ...(otherEarnings > 0 ? [["Other Earnings", otherEarnings]] : []),
    ].filter(([, amount]) => Number(amount || 0) > 0);
    const deductionRows = [
      ...(Number(payroll.attendanceDeduction || 0) > 0 ? [["Attendance Deduction", payroll.attendanceDeduction]] : []),
      ...(Number(payroll.loanDeduction || 0) > 0 ? [["Advance Deduction", payroll.loanDeduction]] : []),
      ...(Number(payroll.fineAmount || 0) > 0 ? [["Fine", payroll.fineAmount]] : []),
    ];
    const maxPayRows = Math.max(3, earningRows.length, deductionRows.length);
    const payGridRows = Array.from({ length: maxPayRows }, (_, index) => ({
      earning: earningRows[index] || ["", ""],
      deduction: deductionRows[index] || ["", ""],
    }));
    const fileName = `${safeFilePart(staffMember.name)}-${safeFilePart(payroll.periodEnd || payroll.month || "salary-slip")}`;
    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(fileName)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #f5f5f5; color: #111; font-family: Arial, Helvetica, sans-serif; }
    .toolbar { position: fixed; top: 14px; right: 14px; z-index: 10; }
    .toolbar button { border: 0; background: #111827; color: white; padding: 9px 14px; border-radius: 6px; font-weight: 700; cursor: pointer; }
    .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 12mm; }
    .slip { border: 1.5px solid #bdbdbd; }
    .header { min-height: 88px; display: flex; align-items: center; justify-content: space-between; padding: 22px 16px 16px; border-bottom: 1.5px solid #bdbdbd; }
    .company h1 { margin: 0 0 8px; font-size: 27px; line-height: 1; color: #333; }
    .company p { margin: 0; font-size: 16px; color: #111; }
    .logo { width: 95px; height: 48px; display: flex; align-items: center; justify-content: center; color: #777; font-size: 12px; font-weight: 800; letter-spacing: 3px; }
    .logo-mark { display: flex; gap: 3px; margin-bottom: 3px; justify-content: center; }
    .logo-mark span { width: 24px; height: 18px; border: 3px solid; border-radius: 5px; display: block; transform: rotate(-10deg); }
    .logo-mark span:nth-child(1) { border-color: #c0392b; }
    .logo-mark span:nth-child(2) { border-color: #27ae60; transform: rotate(18deg); }
    .logo-mark span:nth-child(3) { border-color: #2f6fbd; transform: rotate(-5deg); }
    .logo-mark span:nth-child(4) { border-color: #e5a93b; transform: rotate(0deg); }
    .title { text-align: center; font-size: 22px; font-weight: 800; padding: 16px; border-bottom: 1.5px solid #bdbdbd; }
    .summary { display: grid; grid-template-columns: 1.1fr .9fr; border-bottom: 1.5px solid #bdbdbd; min-height: 185px; }
    .pay-summary { min-width: 0; padding: 18px 16px; border-right: 1.5px solid #bdbdbd; }
    .pay-summary h2 { margin: 0 0 20px; font-size: 18px; text-transform: uppercase; }
    .summary-row { display: grid; grid-template-columns: 145px 14px minmax(0, 1fr); column-gap: 4px; font-size: 15px; line-height: 1.8; }
    .summary-row strong { min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .net-card { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 18px; }
    .net-card span { font-size: 20px; margin-bottom: 10px; }
    .net-card strong { font-size: 42px; line-height: 1.05; }
    .net-card p { margin: 14px 0 0; font-size: 17px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border-right: 1.5px solid #c7c7c7; border-bottom: 1.5px solid #c7c7c7; padding: 13px 13px; font-size: 15px; vertical-align: middle; }
    th:last-child, td:last-child { border-right: 0; }
    th { text-align: left; text-transform: uppercase; font-size: 15px; font-weight: 800; }
    .amount { text-align: right; }
    .pay-table tr:last-child td { border-bottom: 0; }
    .pay-table .total td { font-weight: 800; }
    .net-table th { background: #f7f7f7; }
    .net-table .label-cell { border-right: 1.5px solid #c7c7c7; }
    .net-table .final-label { text-align: right; font-weight: 800; font-size: 18px; }
    .net-table .final-amount { font-weight: 800; font-size: 17px; }
    .words { padding: 28px 18px 24px; text-align: center; border-top: 0; }
    .words strong { font-size: 20px; }
    .words small { display: block; margin-top: 12px; color: #777; font-size: 14px; font-weight: 700; }
    .generated { text-align: center; color: #777; font-size: 13px; margin-top: 28px; }
    @media print {
      body { background: white; }
      .toolbar { display: none; }
      .sheet { width: auto; min-height: auto; margin: 0; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="toolbar"><button onclick="window.print()">Download / Print PDF</button></div>
  <main class="sheet">
    <section class="slip">
      <header class="header">
        <div class="company">
          <h1>${escapeHtml(companyName)}</h1>
          <p>${escapeHtml(companyAddress)}</p>
        </div>
        <div class="logo">
          <div>
            <div class="logo-mark"><span></span><span></span><span></span><span></span></div>
            PAYROLL
          </div>
        </div>
      </header>

      <div class="title">Payslip for the month of ${escapeHtml(monthLabel)}</div>

      <section class="summary">
        <div class="pay-summary">
          <h2>Employee Pay Summary</h2>
          <div class="summary-row"><span>Employee Name</span><b>:</b><strong>${escapeHtml([staffMember.name, staffMember.employeeCode].filter(Boolean).join(", ") || "--")}</strong></div>
          <div class="summary-row"><span>Designation</span><b>:</b><strong>${escapeHtml(staffMember.designation || "--")}</strong></div>
          <div class="summary-row"><span>Date of Joining</span><b>:</b><strong>${formatSlipDate(staffMember.joinDate)}</strong></div>
          <div class="summary-row"><span>Pay Period</span><b>:</b><strong>${escapeHtml(monthLabel)}</strong></div>
          <div class="summary-row"><span>Pay Date</span><b>:</b><strong>${formatSlipDate(payDate)}</strong></div>
        </div>
        <div class="net-card">
          <span>Employee Net Pay</span>
          <strong>${formatSlipMoney(netPay)}</strong>
          <p>Paid Days : ${escapeHtml(paidDays)} | LOP Days : ${lopDays}</p>
        </div>
      </section>

      <table class="pay-table">
        <colgroup>
          <col style="width: 28%" />
          <col style="width: 15%" />
          <col style="width: 13.5%" />
          <col style="width: 20%" />
          <col style="width: 12%" />
          <col style="width: 11.5%" />
        </colgroup>
        <thead>
          <tr>
            <th>Earnings</th>
            <th class="amount">Amount</th>
            <th class="amount">YTD</th>
            <th>Deductions</th>
            <th class="amount">Amount</th>
            <th class="amount">YTD</th>
          </tr>
        </thead>
        <tbody>
          ${payGridRows.map((row) => `<tr>
            <td>${escapeHtml(row.earning[0])}</td>
            <td class="amount">${row.earning[1] === "" ? "" : formatSlipMoney(row.earning[1])}</td>
            <td class="amount">${row.earning[1] === "" ? "" : formatSlipMoney(row.earning[1])}</td>
            <td>${escapeHtml(row.deduction[0])}</td>
            <td class="amount">${row.deduction[1] === "" ? "" : formatSlipMoney(row.deduction[1])}</td>
            <td class="amount">${row.deduction[1] === "" ? "" : formatSlipMoney(row.deduction[1])}</td>
          </tr>`).join("")}
          <tr class="total">
            <td>Gross Earnings</td>
            <td class="amount">${formatSlipMoney(grossEarnings)}</td>
            <td class="amount"></td>
            <td>Total Deductions</td>
            <td class="amount">${formatSlipMoney(totalDeductions)}</td>
            <td class="amount"></td>
          </tr>
        </tbody>
      </table>

      <table class="net-table">
        <colgroup><col style="width: 75%" /><col style="width: 25%" /></colgroup>
        <thead><tr><th>Net Pay</th><th class="amount">Amount</th></tr></thead>
        <tbody>
          <tr><td class="label-cell">Gross Earnings</td><td class="amount">${formatSlipMoney(grossEarnings)}</td></tr>
          <tr><td class="label-cell">Total Deductions</td><td class="amount">(-) ${formatSlipMoney(totalDeductions)}</td></tr>
          <tr><td class="final-label">Total Net Payable</td><td class="amount final-amount">${formatSlipMoney(netPay)}</td></tr>
        </tbody>
      </table>

      <div class="words">
        <strong>Total Net Payable ${formatSlipMoney(netPay)} (Indian Rupee ${escapeHtml(amountToIndianWords(netPay))} Only)</strong>
        <small>*Total Net Payable = Gross Earnings - Total Deductions</small>
      </div>
    </section>
    <div class="generated">-- This document has been automatically generated; therefore, a signature is not required. --</div>
  </main>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.print(); }, 250);
    });
  </script>
</body>
</html>`;

    const slipWindow = window.open("", "_blank", "width=900,height=1200");
    if (!slipWindow) {
      showNotice("error", "Allow popups to download the salary slip.");
      return;
    }
    slipWindow.document.open();
    slipWindow.document.write(html);
    slipWindow.document.close();
  };

  const autoMarkUnmarkedAttendance = async () => {
    if (!canHr("canMarkAttendance")) return showNotice("error", "You do not have permission to mark attendance.");
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
          {/* Add Staff is now handled from the Contacts page. */}
          {/* <button className="hr-btn hr-btn-primary" onClick={() => router.push("/HR/onboard")}>
            + Add Staff
          </button> */}
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
                const accruedSummary = staffAccruedSummaryByStaff.get(idOf(person));
                const scopedPayroll = payrollByStaff.get(idOf(person));
                const draft = attendanceDrafts[idOf(person)] || {};
                const receivable = staffReceivableSummary(person);
                const balance = staffBalanceSummary(person);
                const salaryDue = dueSummary
                  ? Number(dueSummary.amount || 0)
                  : scopedPayroll?.status !== "paid" && isPayrollPayable(scopedPayroll) ? Number(scopedPayroll?.balanceDue ?? scopedPayroll?.netPay ?? 0) : 0;
                const salaryAccrued = accruedSummary ? Number(accruedSummary.amount || 0) : 0;
                const balanceAmount = balance.amount;
                const balanceIsSalaryDue = balance.type === "salary_due" || balance.type === "salary_accrued";
                const staffBasis = normalizeSalaryBasisValue(person.salaryBasis);
                const isHourly = staffBasis === "hourly";
                const isTimeBased = staffBasis === "hourly" || staffBasis === "daily";
                const selectedDate = attendanceDate || localDate();
                const duePayrollForSelectedDate = dueSummary?.payrolls?.find((item) => item.periodEnd === selectedDate)
                  || (scopedPayroll?.periodEnd === selectedDate ? scopedPayroll : null);
                const payroll = duePayrollForSelectedDate || dueSummary?.payroll || scopedPayroll;
                const selectedDateIsDue = isPayrollDueOnDate(person, selectedDate);
                const attendanceMarked = attendanceByStaff.has(idOf(person));
                const canShowPayrollDue = salaryDue > 0;
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
                      {salaryDue > 0 ? (
                        <span className="hr-staff-cell">
                          <strong className="hr-payable-amount">{formatMoney(salaryDue)}</strong>
                          {dueSummary?.hours > 0 && <small>{dueSummary.hours} work hours</small>}
                          {dueSummary?.count > 1 && <small>{dueSummary.count} unpaid payrolls</small>}
                        </span>
                      ) : "-"}
                    </td>
                    <td>
                      <span className="hr-balance-stack">
                        <span className={`hr-balance-chip ${balanceIsSalaryDue ? "due" : "settled"}`}>
                          {balanceIsSalaryDue ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {formatMoney(balanceAmount)}
                        </span>
                        {!balanceIsSalaryDue && (receivable.amount > 0 || receivable.pendingDeduction > 0) && (
                          <small>
                            {[
                              receivable.advance > 0 ? `Advance ${formatMoney(receivable.advance)}` : "",
                              receivable.pendingDeduction > 0 ? `Cut ${formatMoney(receivable.pendingDeduction)}` : "",
                            ].filter(Boolean).join(" / ")}
                          </small>
                        )}
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
                        canHr("canMarkAttendance") ? (
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
                        ) : <span className="hr-muted">No access</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {canShowPayrollDue && canHr("canMakePayments") ? (
                        <button className="hr-btn hr-btn-outline-danger" onClick={() => makeStaffPayment(person)}>
                          Clear Dues
                        </button>
                      ) : canGenerateDue && canHr("canGenerateSalarySlip") ? (
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
                  <strong className="hr-overdue">{formatMoney(staffTableTotals.salaryDue)} {staffTableTotals.salaryDue > 0 && <span className="hr-overdue-label">(overdue)</span>}</strong>
                </td>
                <td>
                  <span className={`hr-footer-balance ${staffTableTotals.salaryDue > staffTableTotals.receivable ? "due" : "settled"}`}>
                    {staffTableTotals.salaryDue > staffTableTotals.receivable ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {formatMoney(Math.abs(staffTableTotals.salaryDue - staffTableTotals.receivable))}
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
            {/* Add Staff is now handled from the Contacts page. */}
            {/* <button className="hr-btn hr-btn-primary compact" onClick={() => router.push("/HR/onboard")}>
              + Add Staff
            </button> */}
          </div>
          <div className="hr-rail-scroll">
            {filteredStaff.map((person) => {
              const balance = staffBalanceSummary(person);
              const selected = idOf(person) === detailStaffId;
              const isSalaryBalance = balance.type === "salary_due" || balance.type === "salary_accrued";
              return (
                <button key={idOf(person)} className={`hr-rail-item ${selected ? "selected" : ""}`} onClick={() => openStaffDetail(person, detailTab)}>
                  <span>
                    <strong>{person.name}</strong>
                    <small className={isSalaryBalance ? "due" : "settled"}>
                      {isSalaryBalance ? <ArrowUp size={22} /> : <ArrowDown size={22} />}
                      {formatMoney(balance.amount)}
                    </small>
                  </span>
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
              <button className="hr-btn hr-btn-ghost" onClick={downloadSalarySlip}>
                <Download size={15} /> Download Salary Slip
              </button>
              {canHr("canMakePayments") && (
                <div className="hr-split-action">
                  <button className="hr-btn hr-btn-primary" onClick={() => makeStaffPayment(selectedDetailStaff)} disabled={saving}>
                    Make Payment
                  </button>
                  <button className="hr-btn hr-btn-primary hr-split-caret" onClick={() => makeStaffPayment(selectedDetailStaff)} disabled={saving} title="Payment options">
                    <ChevronDown size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="hr-detail-tabbar">
            <nav className="hr-detail-tabs">
              {[{ id: "attendance", label: "Attendance" }, { id: "payroll", label: "Payroll" }, ...(canHr("canViewBanks") ? [{ id: "transactions", label: "Transactions" }] : []), { id: "details", label: "Details" }].map((tab) => (
                <button key={tab.id} className={detailTab === tab.id ? "active" : ""} onClick={() => openDetailTab(tab.id)}>
                  {tab.label}
                </button>
              ))}
            </nav>
            {detailTab === "details" && (
              <div className="hr-detail-tab-actions">
                {canHr("canEditStaff") && <button className="hr-btn hr-btn-ghost" onClick={() => router.push(`/HR/staff?id=${idOf(selectedDetailStaff)}`)}>Edit</button>}
                {canHr("canEditStaff") && selectedDetailStaff.status === "active" && <button className="hr-btn hr-btn-outline-danger" onClick={() => archiveStaff(selectedDetailStaff)}>Delete</button>}
              </div>
            )}
          </div>

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
                <th>MENU</th>
              </tr>
            </thead>
            <tbody>
              {attendanceDates.map((date) => {
                const record = detailAttendanceByDate.get(date);
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
                          <button type="button" className={`hr-att-btn ${status === "present" ? "active" : ""}`} onClick={() => quickStatus("present")} disabled={!canHr("canMarkAttendance")} title="Present">P</button>
                          <button type="button" className={`hr-att-btn ${status === "absent" ? "active-absent" : ""}`} onClick={() => quickStatus("absent")} disabled={!canHr("canMarkAttendance")} title="Absent">A</button>
                        </div>
                        {meta && status !== "present" && status !== "absent" && <span className="hr-att-status-pill" style={{ background: pillBg(meta.tone), color: pillFg(meta.tone) }}>{meta.short}</span>}
                        {(overtimeHours > 0 || fineHours > 0) && (
                          <small className="hr-att-adjustment-note">
                            OT {overtimeHours}h / Fine {fineHours}h
                          </small>
                        )}
                      </div>
                    </td>
                    <td>
                      {canHr("canMarkAttendance") ? (
                        <AttendanceRowMenu
                          open={openAttendanceMenu === date}
                          onToggle={() => setOpenAttendanceMenu((current) => current === date ? "" : date)}
                          onAction={(action) => applyDetailAttendanceMenuAction(selectedDetailStaff, date, action)}
                        />
                      ) : <span className="hr-muted">--</span>}
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
    const payrollMonth = payrollMonthFromDueDateForStaff(selectedDetailStaff, payrollDueDate);
    const period = buildPayrollPeriodForStaff(selectedDetailStaff, payrollDueDate, staffPayrollCycleDay(selectedDetailStaff));
    const cycleLabel = `${formatMonthLabel(payrollMonth).split(" ")[0]} (${formatReadableDate(period.periodStart)} - ${formatReadableDate(period.periodEnd)})`;
    const currentBalance = Number(payroll?.balanceDue ?? payroll?.netPay ?? staffBalanceSummary(selectedDetailStaff).amount ?? 0);
    const earningsAmount = Number(payroll?.grossSalary ?? payroll?.baseSalary ?? selectedDetailStaff.monthlySalary ?? 0);
    const markedWeeklyOffDays = Math.max(0, Number(payroll?.payableDays || 0)
      - Number(payroll?.presentDays || 0)
      - (Number(payroll?.halfDays || 0) * 0.5)
      - Number(payroll?.paidLeaveDays || 0)
      - Number(payroll?.shortLeaveDays || 0));
    const weeklyOffAmount = markedWeeklyOffDays * Number(payroll?.dailyRate || 0);
    const paymentsAmount = Number(payroll?.totalPaid || 0);
    const previousBalance = Math.max(0, currentBalance - Number(payroll?.netPay ?? earningsAmount) + paymentsAmount);
    return (
      <div className="hr-detail-payroll">
        <div className="hr-detail-month-bar payroll-month-bar">
          <h3>{formatMonthLabel(payrollMonth)}</h3>
          <div className="hr-month-pill-nav">
            <button className="hr-icon-btn" onClick={() => stepDetailPayrollMonth(-1)}><ChevronLeft size={18} /></button>
            <button type="button" className="hr-month-pill" onClick={() => changeDetailPayrollMonth(payrollMonth)}>
              {formatMonthLabel(payrollMonth).replace(" ", " ")}
            </button>
            <button className="hr-icon-btn" onClick={() => stepDetailPayrollMonth(1)}><ChevronRight size={18} /></button>
          </div>
        </div>
        {payroll ? (
          <div className="hr-payroll-ledger">
            <div className="hr-payroll-ledger-row cycle">
              <strong>{cycleLabel}</strong>
              <b>{formatMoney(currentBalance)}</b>
            </div>
            <div className="hr-payroll-ledger-row section">
              <strong>Earnings</strong>
              <b>{formatMoney(earningsAmount)}</b>
            </div>
            {markedWeeklyOffDays > 0 && (
              <div className="hr-payroll-ledger-row child">
                <span>Marked weekly off ({markedWeeklyOffDays} Days)</span>
                <b>{formatMoney(weeklyOffAmount)}</b>
              </div>
            )}
            <div className="hr-payroll-ledger-row section">
              <strong>Payments</strong>
              <b>{formatMoney(paymentsAmount)}</b>
            </div>
            <div className="hr-payroll-ledger-row section">
              <strong>Previous month balance</strong>
              <b>{formatMoney(previousBalance)}</b>
            </div>
          </div>
        ) : (
          <div className="hr-payroll-ledger">
            <div className="hr-payroll-ledger-row cycle">
              <strong>{cycleLabel}</strong>
              <b>{formatMoney(currentBalance)}</b>
            </div>
            <div className="hr-empty-block compact">No payroll generated for this cycle.</div>
            {canHr("canGenerateSalarySlip") && (
              <button className="hr-btn hr-btn-primary hr-generate-inline" onClick={() => generatePayrollForStaff(selectedDetailStaff)} disabled={saving}>
                <BadgeDollarSign size={15} /> Generate Payroll
              </button>
            )}
          </div>
        )}
        <small className="hr-payroll-footnote">*Amount not included in the final balance of the Salary Cycle</small>
      </div>
    );
  };

  const renderDetailTransactions = () => (
    <div className="hr-detail-transactions">
      <div className="hr-mini-card">
        <div className="hr-sub-head-row">
          <h4>Transactions</h4>
        </div>
        <div className="hr-bank-filter-bar staff-tx-filter-bar">
          <div className="hr-bank-filter-controls">
            <select value={staffTxnFilter.mode} onChange={(e) => setStaffTxnFilter((p) => ({ ...p, mode: e.target.value }))}>
              {TRANSACTION_RANGE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            {staffTxnFilter.mode === "date" && (
              <input type="date" value={staffTxnFilter.date} onChange={(e) => setStaffTxnFilter((p) => ({ ...p, date: e.target.value }))} />
            )}
            {staffTxnFilter.mode === "month" && (
              <input type="month" value={staffTxnFilter.month} onChange={(e) => setStaffTxnFilter((p) => ({ ...p, month: e.target.value }))} />
            )}
            <select value={staffTxnFilter.type} onChange={(e) => setStaffTxnFilter((p) => ({ ...p, type: e.target.value }))}>
              {STAFF_TRANSACTION_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="hr-bank-filter-totals">
            <span className="in">In {formatMoney(filteredStaffTransactionTotals.in)}</span>
            <span className="out">Out {formatMoney(filteredStaffTransactionTotals.out)}</span>
          </div>
        </div>
        <table className="hr-mini-table staff-tx-table">
          <thead><tr><th>Date</th><th>Bank</th><th>Type</th><th>Details</th><th>Amount</th></tr></thead>
          <tbody>
            {filteredSelectedStaffTransactions.length === 0 ? <tr><td colSpan={5} className="hr-empty-cell">{selectedStaffTransactions.length === 0 ? "No transactions yet." : "No transactions for this filter."}</td></tr> : filteredSelectedStaffTransactions.map((t) => {
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
                    {["loan_out", "advance_out", "loan_repayment"].includes(t.type) && <small>Remaining advance {formatMoney(t.loanOutstandingAfter)}</small>}
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
    const salaryBasis = normalizeSalaryBasisValue(selectedDetailStaff.salaryBasis);
    const cycleDay = staffPayrollCycleDay(selectedDetailStaff);
    const openingDate = selectedDetailStaff.joinDate ? formatReadableDate(selectedDetailStaff.joinDate.slice(0, 10)) : "--";
    const address = selectedDetailStaff.address || {};
    const addressLocation = [address.cityName, address.stateName, address.countryName].filter(Boolean).join(", ");
    const addressText = [address.houseAddress, addressLocation].filter(Boolean).join(", ");
    return (
      <div className="hr-staff-info-grid">
        <div className="hr-staff-info-item">
          <span>Staff Name</span>
          <strong>{selectedDetailStaff.name || "--"}</strong>
        </div>
        <div className="hr-staff-info-item">
          <span>Mobile Number</span>
          <strong>{selectedDetailStaff.phone || "--"}</strong>
        </div>
        <div className="hr-staff-info-item">
          <span>Address</span>
          <strong>{addressText || "--"}</strong>
        </div>
        <div className="hr-staff-info-item">
          <span>Opening Balance</span>
          <strong>{formatMoney(selectedDetailStaff.openingBalance || 0)} On {openingDate}</strong>
        </div>
        <div className="hr-staff-info-item">
          <span>Salary</span>
          <strong>{formatMoney(selectedDetailStaff.monthlySalary)}</strong>
        </div>
        <div className="hr-staff-info-item">
          <span>Salary Type</span>
          <strong>{salaryBasis.charAt(0).toUpperCase() + salaryBasis.slice(1)}</strong>
        </div>
        <div className="hr-staff-info-item">
          <span>Salary Cycle</span>
          <strong>{salaryBasis === "monthly" ? `${cycleDay} To ${cycleDay} Every Month` : "Every Day"}</strong>
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
        <CheckCircle2 size={14} /> Mark Staff
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
        {editingDepartmentId && (
          <Field label="Super Admin Password" className="hr-span2">
            <input value={departmentForm.superAdmin?.password || ""} readOnly placeholder="No password on response" />
          </Field>
        )}
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
                <button className="hr-icon-btn" onClick={() => { setEditingDepartmentId(idOf(dept)); setDepartmentForm({ name: dept.name || "", description: dept.description || "", weeklyOffDays: dept.weeklyOffDays || [], shift: { name: dept.shift?.name || "General", start: dept.shift?.start || "09:00", end: dept.shift?.end || "18:00", breakMinutes: dept.shift?.breakMinutes ?? 60 }, leavePolicy: { paidLeaves: dept.leavePolicy?.paidLeaves ?? 0, shortLeaves: dept.leavePolicy?.shortLeaves ?? 0 }, superAdmin: dept.superAdmin || null }); }}><Pencil size={13} /></button>
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
        <Field label="Country">
          <select value={staffForm.addressCountry} onChange={(e) => setStaffForm({ ...staffForm, addressCountry: e.target.value, addressState: "", addressCity: "" })}>
            <option value="">Select country</option>
            {COUNTRY_OPTIONS.map((country) => <option key={country.isoCode} value={country.isoCode}>{country.name}</option>)}
          </select>
        </Field>
        <Field label="State">
          <select value={staffForm.addressState} onChange={(e) => setStaffForm({ ...staffForm, addressState: e.target.value, addressCity: "" })} disabled={!staffForm.addressCountry}>
            <option value="">Select state</option>
            {staffAddressStates.map((state) => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}
          </select>
        </Field>
        <Field label="City">
          <select value={staffForm.addressCity} onChange={(e) => setStaffForm({ ...staffForm, addressCity: e.target.value })} disabled={!staffForm.addressState}>
            <option value="">Select city</option>
            {staffAddressCities.map((city) => <option key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>{city.name}</option>)}
          </select>
        </Field>
        <Field label="House / Street Address" className="hr-span2">
          <textarea value={staffForm.houseAddress} onChange={(e) => setStaffForm({ ...staffForm, houseAddress: e.target.value })} placeholder="House number, street, landmark" rows={3} />
        </Field>
        <div className="hr-span2 hr-bank-details-toggle">
          <button type="button" className="hr-btn hr-btn-ghost" onClick={() => setStaffBankDetailsOpen((open) => !open)}>
            <CreditCard size={14} /> {staffBankDetailsOpen ? "Hide Bank Detail" : "Add Bank Detail"}
          </button>
        </div>
        {staffBankDetailsOpen && (
          <>
            <Field label="Bank Name"><input value={staffForm.bankName} onChange={(e) => setStaffForm({ ...staffForm, bankName: e.target.value })} placeholder="e.g. State Bank of India" /></Field>
            <Field label="Account Holder Name"><input value={staffForm.accountHolderName} onChange={(e) => setStaffForm({ ...staffForm, accountHolderName: e.target.value })} placeholder="Account holder name" /></Field>
            <Field label="Account Number"><input value={staffForm.accountNumber} onChange={(e) => setStaffForm({ ...staffForm, accountNumber: e.target.value })} placeholder="Account No" /></Field>
            <Field label="IFSC Code"><input value={staffForm.ifscCode} onChange={(e) => setStaffForm({ ...staffForm, ifscCode: e.target.value.toUpperCase() })} placeholder="IFSC" /></Field>
            <Field label="Branch"><input value={staffForm.branch} onChange={(e) => setStaffForm({ ...staffForm, branch: e.target.value })} placeholder="Branch name" /></Field>
            <Field label="UPI ID"><input value={staffForm.upiId} onChange={(e) => setStaffForm({ ...staffForm, upiId: e.target.value })} placeholder="UPI ID" /></Field>
          </>
        )}
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
          {editingStaffId && <button type="button" className="hr-btn hr-btn-ghost" onClick={() => { setEditingStaffId(""); setStaffForm({ ...emptyStaff, payrollCycleDay: cycleStartDay }); setStaffBankDetailsOpen(false); }}>Cancel</button>}
          <button type="submit" className="hr-btn hr-btn-primary" disabled={saving}><Save size={14} /> {editingStaffId ? "Update Staff" : "Add Staff"}</button>
        </div>
      </form>
    </div>
  );

  const renderBanksLoans = () => (
    <section className="hr-main-section">
      <div className="hr-section-topbar">
        <h1>Banks &amp; Advances</h1>
        <div className="hr-topbar-actions">
          {canHr("canManageBanks") && <button className="hr-btn hr-btn-ghost" onClick={() => setToolsOpen("bank")}><Plus size={14} /> Add Bank</button>}
          {canHr("canManageAdvances") && <button className="hr-btn hr-btn-ghost" onClick={() => setToolsOpen("view-loans")}><Wallet size={14} /> View Advances</button>}
          {canHr("canMakePayments") && <button className="hr-btn hr-btn-primary" onClick={() => openBankPayment(selectedBankAccount)} disabled={banks.length === 0}><CreditCard size={14} /> Make Payment</button>}
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
            <span>Advance Outstanding:</span>
            <strong>{formatMoney(summary?.loanOutstanding)}</strong>
          </div>
          <div className="hr-ledger-section-title">
            <span>Bank Accounts</span>
            {canHr("canManageBanks") && <button className="hr-link-btn" onClick={() => setToolsOpen("bank")}>+ Add New Bank</button>}
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
                  {canHr("canManageBanks") && <button className="hr-btn hr-btn-ghost" onClick={() => openAddBankMoney(selectedBankAccount)}><Plus size={14} /> Add Money</button>}
                  {canHr("canMakePayments") && <button className="hr-btn hr-btn-ghost" onClick={() => openBankPayment(selectedBankAccount)}><CreditCard size={14} /> Make Payment</button>}
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
                          {item.hasLoanBalance && <small>Remaining advance {formatMoney(item.loanOutstandingAfter)}</small>}
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
          {canHr("canManageBanks") && <button className="hr-btn hr-btn-ghost" onClick={() => openAddBankMoney(selectedBankAccount)} disabled={banks.length === 0}><Plus size={14} /> Add Money</button>}
          {canHr("canMakePayments") && <button className="hr-btn hr-btn-primary" onClick={() => openBankPayment(selectedBankAccount)} disabled={banks.length === 0}><CreditCard size={14} /> Make Payment</button>}
          <button className="hr-btn hr-btn-ghost" onClick={loadAll}><RefreshCcw size={14} /> Refresh</button>
        </div>
      </div>
      <div className="hr-metrics-row">
        {[
          { icon: Users, label: "Active Staff", value: summary?.activeStaffCount || 0, tone: "blue" },
          ...(canHr("canViewBanks") ? [
            { icon: Landmark, label: "Bank Balance", value: formatMoney(summary?.bankBalance), tone: "green" },
            { icon: ArrowDown, label: "Money In", value: formatMoney(allBankTransactionTotals.in), tone: "blue" },
            { icon: ArrowUp, label: "Money Out", value: formatMoney(allBankTransactionTotals.out), tone: "rose" },
          ] : []),
          { icon: DollarSign, label: "Salary Dues", value: formatMoney(summary?.dues), tone: "amber" },
          ...(canHr("canManageAdvances") ? [{ icon: Wallet, label: "Advance", value: formatMoney(summary?.loanOutstanding), tone: "violet" }] : []),
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
          <InfoRow label="Advance deduction" value={formatMoney(payrollTotals.loan)} />
          <InfoRow label="Paid" value={formatMoney(payrollTotals.paid)} />
          <InfoRow label="Net dues" value={formatMoney(payrollTotals.dues)} strong />
        </div>
        <div className="hr-mini-card">
          <h4>Advance</h4>
          <InfoRow label="Active records" value={repaymentBreakdown.count} />
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
                    {item.hasLoanBalance && <small>Remaining advance {formatMoney(item.loanOutstandingAfter)}</small>}
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
    if (toolsOpen === "bank" && !canHr("canManageBanks")) return null;
    if (["loan", "view-loans"].includes(toolsOpen) && !canHr("canManageAdvances")) return null;
    if (toolsOpen === "staff" && !canHr(editingStaffId ? "canEditStaff" : "canAddStaff")) return null;
    const titles = { staff: editingStaffId ? "Edit Staff" : "Add Staff", "attendance-settings": "Attendance Settings", department: editingDepartmentId ? "Edit Department" : "Add Department", bank: "Add Bank", loan: "Add Advance", "view-loans": "Advances" };
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
              <h3>Advances</h3>
              <p className="hr-muted">All staff advances and outstanding salary adjustments.</p>
            </div>
            {canHr("canMakePayments") && <button className="hr-btn hr-btn-primary compact" onClick={() => { setToolsOpen(""); openBankPayment(selectedBankAccount); }} disabled={banks.length === 0}><CreditCard size={14} /> Make Payment</button>}
          </div>
          <div className="hr-loans-list">
            {loans.length === 0 ? (
              <div className="hr-empty-block">No advances yet.</div>
            ) : loans.map((loan) => (
              <div key={idOf(loan)} className="hr-loan-card">
                <div>
                  <strong>{loan.staff?.name || "Staff"}</strong>
                  <small>{loan.staff?.department?.name || loan.staff?.designation || "Staff advance"}</small>
                </div>
                <div><span>{repaymentKindLabel(loan)}</span><strong>{formatMoney(loan.amount)}</strong></div>
                <div><span>Next salary cut</span><strong>{formatMoney(Math.min(Number(loan.emi || 0), Number(loan.outstanding || 0)))}</strong></div>
                <div><span>Outstanding</span><strong>{formatMoney(loan.outstanding)}</strong></div>
                <div className="hr-loan-card-actions">
                  <span className={`hr-pill ${loan.status === "active" ? "amber" : "green"}`}>{loan.status}</span>
                  {loan.status === "active" && canHr("canManageAdvances") && <button className="hr-btn hr-btn-ghost compact" onClick={() => closeLoan(loan)}>Close</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
      loan: (
        <div className="hr-tools-panel">
          <h3>Add Advance</h3>
          <form className="hr-form-grid-2" onSubmit={saveLoan}>
            <Field label="Staff">
              <select value={loanForm.staff} onChange={(e) => setLoanForm({ ...loanForm, staff: e.target.value })}>
                <option value="">Select staff</option>
                {activeStaff.map((p) => <option key={idOf(p)} value={idOf(p)}>{staffLabel(p)}</option>)}
              </select>
            </Field>
            <Field label="Advance Amount"><input type="number" min="0" value={loanForm.amount} onChange={(e) => setLoanForm({ ...loanForm, amount: e.target.value, emi: e.target.value })} /></Field>
            <Field label="Advance Date"><input type="date" value={loanForm.issueDate} onChange={(e) => setLoanForm({ ...loanForm, issueDate: e.target.value })} /></Field>
            <Field label="Note"><input value={loanForm.note} onChange={(e) => setLoanForm({ ...loanForm, note: e.target.value })} placeholder="Optional" /></Field>
            <div className="hr-span2 hr-form-actions-row"><button type="submit" className="hr-btn hr-btn-primary" disabled={saving}><Plus size={14} /> Add Advance</button></div>
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
    const markedWeeklyOffDays = Math.max(0, Number(clearDuePayroll.payableDays || 0)
      - Number(clearDuePayroll.presentDays || 0)
      - (Number(clearDuePayroll.halfDays || 0) * 0.5)
      - Number(clearDuePayroll.paidLeaveDays || 0)
      - Number(clearDuePayroll.shortLeaveDays || 0));

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
              <InfoRow label="Came days" value={`${payrollCameDays(clearDuePayroll)} days`} />
              <InfoRow label="Marked weekly off" value={`${markedWeeklyOffDays} days`} />
              <InfoRow label="Daily rate" value={formatMoney(clearDuePayroll.dailyRate || (clearDuePayroll.workingDays ? Number(clearDuePayroll.baseSalary || 0) / clearDuePayroll.workingDays : 0))} />
              <InfoRow label="Hourly rate" value={formatMoney(hourlyRate)} />
              <InfoRow label="Present / Half / Absent" value={`${clearDuePayroll.presentDays || 0} / ${clearDuePayroll.halfDays || 0} / ${clearDuePayroll.absentDays || 0}`} />
              <InfoRow label="Paid / Short leave" value={`${clearDuePayroll.paidLeaveDays || 0} / ${clearDuePayroll.shortLeaveDays || 0}`} />
              <InfoRow label="Unpaid leave" value={`${clearDuePayroll.unpaidLeaveDays || 0} days`} />
              <InfoRow label="Gross salary" value={formatMoney(clearDuePayroll.grossSalary)} />
              <InfoRow label="Attendance deduction" value={formatMoney(clearDuePayroll.attendanceDeduction)} />
              <InfoRow label="Advance deduction" value={formatMoney(clearDuePayroll.loanDeduction)} />
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
                {canHr("canMakePayments") && <button className="hr-btn hr-btn-primary" onClick={payPayroll} disabled={saving}><CreditCard size={14} /> Pay</button>}
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
    const isEmployee = bankPaymentForm.partyType === "employee" || (bankPaymentForm.lockedStaff && Boolean(bankPaymentForm.staff));
    const isOut = bankPaymentForm.direction === "out";
    const isSalaryPayment = isOut && isEmployee && bankPaymentForm.purpose === "salary";
    const isAdvancePayment = isOut && isEmployee && bankPaymentForm.purpose === "advance";
    const isLoanRepayment = !isOut && isEmployee && bankPaymentForm.purpose === "advance_repayment";
    const selectedStaffLabel = selectedPaymentStaff ? staffLabel(selectedPaymentStaff) : "Select employee";
    const isLockedEmployeePayment = isEmployee && bankPaymentForm.lockedStaff && Boolean(bankPaymentForm.staff);
    return (
      <div className="hr-modal-backdrop" onClick={() => setPayNowBank(null)}>
        <div className="hr-modal payment-modal" onClick={(e) => e.stopPropagation()}>
          <div className="hr-modal-header">
            <h3>Make Payment</h3>
            <button className="hr-icon-btn" onClick={() => setPayNowBank(null)}><X size={16} /></button>
          </div>
          <div className="hr-payment-direction">
            <label className={`hr-payment-choice ${bankPaymentForm.direction === "out" ? "active" : ""}`}>
              <input
                type="radio"
                name="payment_direction"
                value="out"
                checked={bankPaymentForm.direction === "out"}
                onChange={() => setBankPaymentForm((p) => {
                  const firstPayroll = payrolls.find((payroll) => idOf(payroll.staff) === p.staff && payroll.status !== "paid" && isPayrollPayable(payroll) && (Number(payroll.balanceDue ?? payroll.netPay ?? 0) > 0 || payrollNeedsLoanSettlement(payroll)));
                  return { ...p, direction: "out", purpose: "salary", payroll: firstPayroll ? idOf(firstPayroll) : "", amount: firstPayroll ? (firstPayroll.balanceDue ?? firstPayroll.netPay ?? "") : p.amount, loan: "" };
                })}
              />
              <ArrowUp size={14} />
              Payment Out
            </label>
            <label className={`hr-payment-choice ${bankPaymentForm.direction === "in" ? "active" : ""}`}>
              <input
                type="radio"
                name="payment_direction"
                value="in"
                checked={bankPaymentForm.direction === "in"}
                onChange={() => setBankPaymentForm((p) => {
                  const firstAdvance = selectedPaymentLoans[0];
                  return {
                    ...p,
                    direction: "in",
                    purpose: firstAdvance ? "advance_repayment" : "general",
                    loan: firstAdvance ? idOf(firstAdvance) : "",
                    amount: firstAdvance ? Number(firstAdvance.outstanding || 0) : p.amount,
                    payroll: "",
                    emi: "",
                  };
                })}
              />
              <ArrowDown size={14} />
              Payment In
            </label>
          </div>
          <div className="hr-form-grid-2 mt12">
            <Field label="Bank Account">
              <select value={bankPaymentForm.bankId} onChange={(e) => setBankPaymentForm((p) => ({ ...p, bankId: e.target.value }))}>
                <option value="">Select bank</option>
                {banks.map((bank) => <option key={idOf(bank)} value={idOf(bank)}>{bank.name} - {formatMoney(bank.balance)}</option>)}
              </select>
            </Field>
            {isLockedEmployeePayment ? (
              <Field label="Employee">
                <div className="hr-readonly-field">{selectedStaffLabel}</div>
              </Field>
            ) : isEmployee ? (
              <Field label="Employee">
                <select value={bankPaymentForm.staff} onChange={(e) => {
                  const nextStaff = e.target.value;
                  const firstPayroll = payrolls.find((payroll) => idOf(payroll.staff) === nextStaff && payroll.status !== "paid" && isPayrollPayable(payroll) && (Number(payroll.balanceDue ?? payroll.netPay ?? 0) > 0 || payrollNeedsLoanSettlement(payroll)));
                  setBankPaymentForm((p) => ({
                    ...p,
                    staff: nextStaff,
                    purpose: !isOut ? "general" : p.purpose,
                    loan: "",
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
                  {canHr("canManageAdvances") && <option value="advance">Advance</option>}
                </select>
              </Field>
            )}

            {!isOut && isEmployee && (
              <Field label="Payment For">
                <select value={bankPaymentForm.purpose} onChange={(e) => {
                  const nextPurpose = e.target.value;
                  const firstAdvance = selectedPaymentLoans[0];
                  setBankPaymentForm((p) => ({
                    ...p,
                    purpose: nextPurpose,
                    loan: nextPurpose === "advance_repayment" && firstAdvance ? idOf(firstAdvance) : "",
                    amount: nextPurpose === "advance_repayment" && firstAdvance ? Number(firstAdvance.outstanding || 0) : "",
                  }));
                }}>
                  <option value="general">General received</option>
                  {canHr("canManageAdvances") && <option value="advance_repayment">Advance money</option>}
                </select>
              </Field>
            )}

            {isSalaryPayment && selectedPaymentPayrolls.length > 0 && (
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
              <Field label="Employee Advance">
                <select value={bankPaymentForm.loan} onChange={(e) => {
                  const loan = selectedPaymentLoans.find((item) => idOf(item) === e.target.value);
                  setBankPaymentForm((p) => ({
                    ...p,
                    loan: e.target.value,
                    amount: loan ? Number(loan.outstanding || 0) : p.amount,
                  }));
                }}>
                  <option value="">Select advance</option>
                  {selectedPaymentLoans.map((loan) => (
                    <option key={idOf(loan)} value={idOf(loan)}>
                      Advance {formatMoney(loan.outstanding)} outstanding
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <Field label={isSalaryPayment ? "Salary Amount" : isAdvancePayment ? "Advance Amount" : isLoanRepayment ? "Advance Return Amount" : "Amount"}>
              <input type="number" min="0" step="0.01" value={bankPaymentForm.amount} onChange={(e) => setBankPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
            </Field>

            {isAdvancePayment && (
              <Field label="Advance Date">
                <input type="date" value={bankPaymentForm.issueDate} onChange={(e) => setBankPaymentForm((p) => ({ ...p, issueDate: e.target.value }))} />
              </Field>
            )}

            <Field label="Note" className="hr-span2">
              <input value={bankPaymentForm.note} onChange={(e) => setBankPaymentForm((p) => ({ ...p, note: e.target.value }))} placeholder="Optional" />
            </Field>
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
  const renderSelfServiceHR = () => {
    const person = selfHr?.staff;
    const userPayrolls = selfHr?.payrolls || [];
    const userAttendance = selfHr?.attendance || [];
    const userTransactions = selfHr?.bankTransactions || [];
    const latestPayroll = userPayrolls[0] || null;
    const salaryBasis = normalizeSalaryBasisValue(person?.salaryBasis);
    const attendanceCounts = userAttendance.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, { present: 0, absent: 0, half_day: 0, paid_leave: 0, short_leave: 0, weekly_off: 0 });
    const workingEntries = Number(attendanceCounts.present || 0)
      + Number(attendanceCounts.half_day || 0)
      + Number(attendanceCounts.short_leave || 0);
    const workingValue = latestPayroll
      ? salaryBasis === "hourly"
        ? `${latestPayroll.totalWorkHours || 0} hours`
        : `${payrollCameDays(latestPayroll)} days`
      : `${workingEntries} days`;

    if (!person) {
      return (
        <section className="hr-main-section hr-self-service">
          <div className="hr-empty-block">
            No HR profile is linked to your account yet. Ask admin to match your phone or email in Staff.
          </div>
        </section>
      );
    }

    return (
      <section className="hr-main-section hr-self-service">
        <div className="hr-self-hero">
          <div className="hr-self-title">
            <span>Employee HR</span>
            <h1>{person.name}</h1>
            <p>{person.department?.name || "Unassigned"}{person.designation ? ` / ${person.designation}` : ""}</p>
          </div>
          <div className="hr-self-period">
            <span>Period</span>
            <button className="hr-icon-btn" onClick={() => setSelfMonth((month) => shiftMonth(month, -1))}><ChevronLeft size={18} /></button>
            <input type="month" value={selfMonth} onChange={(e) => setSelfMonth(e.target.value)} />
            <button className="hr-icon-btn" onClick={() => setSelfMonth((month) => shiftMonth(month, 1))}><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="hr-self-overview">
          <div className="hr-self-salary-card">
            <span>Salary</span>
            <strong>{formatMoney(person.monthlySalary)}</strong>
            <small>{salaryBasis.charAt(0).toUpperCase() + salaryBasis.slice(1)} salary cycle</small>
          </div>
          <div className="hr-self-stat green"><Wallet size={18} /><span>Latest net pay</span><strong>{formatMoney(latestPayroll?.netPay)}</strong></div>
          <div className="hr-self-stat blue"><ListChecks size={18} /><span>Working</span><strong>{workingValue}</strong></div>
          <div className="hr-self-stat amber"><BadgeDollarSign size={18} /><span>Balance due</span><strong>{formatMoney(latestPayroll?.balanceDue ?? 0)}</strong></div>
          <div className="hr-self-stat rose"><AlertCircle size={18} /><span>Absent</span><strong>{attendanceCounts.absent || 0} days</strong></div>
        </div>

        <div className="hr-self-grid">
          <div className="hr-mini-card">
            <div className="hr-self-card-head">
              <div>
                <h4>Payroll</h4>
                <span>{userPayrolls.length} salary cycle{userPayrolls.length === 1 ? "" : "s"}</span>
              </div>
            </div>
            <div className="hr-self-table-scroll">
              <table className="hr-mini-table hr-self-payroll-table">
                <thead><tr><th>Period</th><th>Working</th><th>Gross</th><th>Paid</th><th>Due</th><th>Status</th></tr></thead>
                <tbody>
                  {userPayrolls.length === 0 ? (
                    <tr><td colSpan={6} className="hr-empty-cell">No payroll generated yet.</td></tr>
                  ) : userPayrolls.map((payroll) => (
                    <tr key={idOf(payroll)}>
                      <td>{payroll.periodLabel || payroll.periodEnd || "--"}</td>
                      <td>{normalizeSalaryBasisValue(payroll.salaryBasis) === "hourly" ? `${payroll.totalWorkHours || 0}h` : `${payrollCameDays(payroll)}d`}</td>
                      <td>{formatMoney(payroll.grossSalary)}</td>
                      <td>{formatMoney(payroll.totalPaid)}</td>
                      <td>{formatMoney(payroll.balanceDue ?? payroll.netPay)}</td>
                      <td><span className={`hr-pill ${payroll.status === "paid" ? "green" : payroll.status === "partial" ? "amber" : "slate"}`}>{payroll.status || "draft"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hr-mini-card">
            <div className="hr-self-card-head">
              <div>
                <h4>Attendance</h4>
                <span>{formatMonthLabel(selfMonth)}</span>
              </div>
            </div>
            <div className="hr-self-table-scroll hr-self-summary-scroll">
              {renderSummaryStrip({
                present: attendanceCounts.present || 0,
                absent: attendanceCounts.absent || 0,
                half_day: attendanceCounts.half_day || 0,
                paid_leave: attendanceCounts.paid_leave || 0,
                weekly_off: attendanceCounts.weekly_off || 0,
              })}
            </div>
            <div className="hr-self-table-scroll">
              <table className="hr-mini-table hr-self-attendance-table">
                <thead><tr><th>Date</th><th>Status</th><th>Hours</th></tr></thead>
                <tbody>
                  {userAttendance.length === 0 ? (
                    <tr><td colSpan={3} className="hr-empty-cell">No attendance marked for this month.</td></tr>
                  ) : userAttendance.map((item) => {
                    const meta = ATTENDANCE_STATUS_META[item.status] || { label: item.status || "--", tone: "slate" };
                    return (
                      <tr key={idOf(item)}>
                        <td>{formatReadableDate(item.date, { weekday: "short" })}</td>
                        <td><span className="hr-att-status-pill" style={{ background: pillBg(meta.tone), color: pillFg(meta.tone) }}>{meta.label}</span></td>
                        <td>{Number(item.workHours || 0)}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="hr-mini-card">
            <div className="hr-self-card-head">
              <div>
                <h4>Bank Transactions</h4>
                <span>{userTransactions.length} transaction{userTransactions.length === 1 ? "" : "s"}</span>
              </div>
            </div>
            <div className="hr-self-table-scroll">
              <table className="hr-mini-table hr-self-transactions-table">
                <thead><tr><th>Date</th><th>Type</th><th>Bank</th><th>Amount</th><th>Note</th></tr></thead>
                <tbody>
                  {userTransactions.length === 0 ? (
                    <tr><td colSpan={5} className="hr-empty-cell">No bank transactions for this month.</td></tr>
                  ) : userTransactions.map((item) => {
                    const isIn = transactionDirection(item) === "in";
                    return (
                      <tr key={idOf(item) || `${idOf(item.bank)}-${item.paidAt}`}>
                        <td>{formatReadableDate(item.paidAt)}</td>
                        <td>{transactionTitle(item)}</td>
                        <td>{item.bank?.name || "--"}</td>
                        <td className={isIn ? "text-green" : "text-rose"}>{isIn ? "+" : "-"}{formatMoney(item.amount)}</td>
                        <td>{item.note || transactionPeriodLabel(item) || "--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    );
  };

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
        <HRPageSkeleton />
      ) : isRegularHrUser ? (
        renderSelfServiceHR()
      ) : (
        <>
          {/* Top tab bar */}
          <nav className="hr-nav-tabs">
            {visibleHrTabs.map((tab) => {
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

      {!isRegularHrUser && renderToolsModal()}
      {!isRegularHrUser && renderOvertimeModal()}
      {!isRegularHrUser && renderFineModal()}
      {!isRegularHrUser && renderClearDueModal()}
      {!isRegularHrUser && renderBankTransactionsModal()}
      {!isRegularHrUser && renderAddBankMoneyModal()}
      {!isRegularHrUser && renderBankPayModal()}
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

function SkeletonBlock({ className = "", style = {} }) {
  return <span className={`hr-skeleton ${className}`} style={style} />;
}

function HRPageSkeleton() {
  return (
    <div className="hr-skeleton-page" role="status" aria-live="polite" aria-label="Loading HR system">
      <div className="hr-nav-tabs hr-skeleton-tabs" aria-hidden="true">
        {HR_MAIN_TABS.map((tab, index) => (
          <div key={tab.id} className={`hr-nav-tab hr-skeleton-tab ${index === 0 ? "active" : ""}`}>
            <SkeletonBlock className="hr-skeleton-icon" />
            <SkeletonBlock style={{ width: index === 1 ? 108 : 78, height: 12 }} />
          </div>
        ))}
      </div>

      <section className="hr-main-section hr-skeleton-section" aria-hidden="true">
        <div className="hr-section-topbar">
          <div>
            <SkeletonBlock style={{ width: 210, height: 22, marginBottom: 8 }} />
            <SkeletonBlock style={{ width: 165, height: 12 }} />
          </div>
          <div className="hr-topbar-actions">
            <SkeletonBlock style={{ width: 116, height: 36, borderRadius: 8 }} />
            <SkeletonBlock style={{ width: 132, height: 36, borderRadius: 8 }} />
          </div>
        </div>

        <div className="hr-date-bar">
          <div>
            <SkeletonBlock style={{ width: 150, height: 18, marginBottom: 7 }} />
            <SkeletonBlock style={{ width: 112, height: 12 }} />
          </div>
          <div className="hr-date-nav-row">
            <SkeletonBlock style={{ width: 36, height: 36, borderRadius: 8 }} />
            <SkeletonBlock style={{ width: 142, height: 36, borderRadius: 8 }} />
            <SkeletonBlock style={{ width: 36, height: 36, borderRadius: 8 }} />
          </div>
        </div>

        <div className="hr-summary-strip">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="hr-summary-cell">
              <SkeletonBlock style={{ width: 74, height: 12, marginBottom: 8 }} />
              <SkeletonBlock style={{ width: 42, height: 22 }} />
            </div>
          ))}
        </div>

        <div className="hr-att-table-wrap">
          <table className="hr-att-table hr-skeleton-table">
            <thead>
              <tr>
                <th><SkeletonBlock style={{ width: 72, height: 10 }} /></th>
                <th><SkeletonBlock style={{ width: 64, height: 10 }} /></th>
                <th><SkeletonBlock style={{ width: 82, height: 10 }} /></th>
                <th><SkeletonBlock style={{ width: 70, height: 10 }} /></th>
                <th><SkeletonBlock style={{ width: 92, height: 10 }} /></th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <tr key={row}>
                  <td>
                    <div className="hr-skeleton-staff">
                      <SkeletonBlock className="hr-skeleton-avatar" />
                      <div>
                        <SkeletonBlock style={{ width: row % 2 ? 132 : 164, height: 14, marginBottom: 7 }} />
                        <SkeletonBlock style={{ width: 92, height: 10 }} />
                      </div>
                    </div>
                  </td>
                  <td><SkeletonBlock style={{ width: 86, height: 14 }} /></td>
                  <td><SkeletonBlock style={{ width: 118, height: 30, borderRadius: 7 }} /></td>
                  <td><SkeletonBlock style={{ width: 72, height: 14 }} /></td>
                  <td><SkeletonBlock style={{ width: 140, height: 14 }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
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
    { id: "weekly_off", label: "Week Off" },
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
    --hr-primary: #0d9488;
    --hr-primary-dark: #0b6f68;
    --hr-primary-soft: rgba(13,148,136,0.1);
    --hr-primary-border: rgba(13,148,136,0.28);
    --hr-green: #0f766e;
    --hr-line: #e2e8f0;
    --hr-muted: #64748b;
    --hr-bg: var(--card-bg, #fff);
  }

  body[data-theme="dark"] .hr-page {
    --hr-primary: #00a884;
    --hr-primary-dark: #008069;
    --hr-primary-soft: rgba(0,168,132,0.14);
    --hr-primary-border: rgba(0,168,132,0.34);
    --hr-green: #00a884;
    --hr-line: #2a3942;
    --hr-muted: #9fb0ba;
    --hr-bg: #111b21;
    --hr-surface: #202c33;
    --hr-surface-soft: #16252c;
    --hr-surface-raised: #1f3038;
    --hr-input: #202c33;
    --hr-text: #e9edef;
  }

  body[data-theme="dark"] .hr-page,
  body[data-theme="dark"] .hr-main-section,
  body[data-theme="dark"] .hr-detail-layout,
  body[data-theme="dark"] .hr-modal,
  body[data-theme="dark"] .hr-detail-rail,
  body[data-theme="dark"] .hr-bank-ledger-detail {
    color: var(--hr-text);
  }

  body[data-theme="dark"] .hr-main-section,
  body[data-theme="dark"] .hr-detail-layout {
    background: var(--hr-bg);
    border-color: var(--hr-line);
    box-shadow: 0 18px 42px rgba(0,0,0,0.22);
  }

  body[data-theme="dark"] .hr-nav-tab {
    background: var(--hr-surface);
    border-color: var(--hr-line);
    color: var(--hr-muted);
  }

  body[data-theme="dark"] .hr-nav-tab:hover {
    border-color: #3b4f5a;
    background: var(--hr-surface-raised);
    color: var(--hr-text);
  }

  body[data-theme="dark"] .hr-nav-tab.active {
    background: linear-gradient(135deg, #008069 0%, #00a884 100%);
    border-color: rgba(94,234,212,0.45);
    color: #fff;
    box-shadow: 0 10px 28px rgba(0,168,132,0.24);
  }

  body[data-theme="dark"] .hr-section-topbar,
  body[data-theme="dark"] .hr-detail-topbar,
  body[data-theme="dark"] .hr-detail-tabs,
  body[data-theme="dark"] .hr-summary-strip,
  body[data-theme="dark"] .hr-finance-strip,
  body[data-theme="dark"] .hr-cash-bank-layout,
  body[data-theme="dark"] .hr-bank-detail-tabs,
  body[data-theme="dark"] .hr-bank-account-summary,
  body[data-theme="dark"] .hr-ledger-balance,
  body[data-theme="dark"] .hr-ledger-section-title,
  body[data-theme="dark"] .hr-rail-head,
  body[data-theme="dark"] .hr-rail-item,
  body[data-theme="dark"] .hr-bank-ledger-item {
    border-color: var(--hr-line);
  }

  body[data-theme="dark"] .hr-section-topbar h1,
  body[data-theme="dark"] .hr-sub-h,
  body[data-theme="dark"] .hr-tools-panel h3,
  body[data-theme="dark"] .hr-modal-header h3,
  body[data-theme="dark"] .hr-summary-cell strong,
  body[data-theme="dark"] .hr-metric-card strong,
  body[data-theme="dark"] .hr-finance-strip strong,
  body[data-theme="dark"] .hr-finance-card strong,
  body[data-theme="dark"] .hr-finance-card b,
  body[data-theme="dark"] .hr-mini-card strong,
  body[data-theme="dark"] .hr-payroll-detail-card h4,
  body[data-theme="dark"] .hr-bank-ledger-item b,
  body[data-theme="dark"] .hr-bank-account-summary strong,
  body[data-theme="dark"] .hr-loan-card strong {
    color: var(--hr-text);
  }

  body[data-theme="dark"] .hr-att-table th,
  body[data-theme="dark"] .hr-detail-att-table th,
  body[data-theme="dark"] .hr-mini-table th,
  body[data-theme="dark"] .hr-att-table tfoot td,
  body[data-theme="dark"] .hr-field-inline,
  body[data-theme="dark"] .hr-field,
  body[data-theme="dark"] .hr-mini-card,
  body[data-theme="dark"] .hr-dept-card,
  body[data-theme="dark"] .hr-finance-strip div,
  body[data-theme="dark"] .hr-finance-card,
  body[data-theme="dark"] .hr-finance-table-wrap,
  body[data-theme="dark"] .hr-bank-modal-summary div,
  body[data-theme="dark"] .hr-bank-ledger-rail,
  body[data-theme="dark"] .hr-ledger-balance.subtle,
  body[data-theme="dark"] .hr-bank-detail-tabs,
  body[data-theme="dark"] .hr-bank-detail-tabs button,
  body[data-theme="dark"] .hr-payment-direction,
  body[data-theme="dark"] .hr-payment-choice,
  body[data-theme="dark"] .hr-payment-preview,
  body[data-theme="dark"] .ot-total,
  body[data-theme="dark"] .hr-loan-card,
  body[data-theme="dark"] .hr-metric-card,
  body[data-theme="dark"] .ot-info-row {
    background: var(--hr-surface-soft);
    border-color: var(--hr-line);
  }

  body[data-theme="dark"] .hr-metric-card,
  body[data-theme="dark"] .hr-finance-strip div,
  body[data-theme="dark"] .hr-mini-card,
  body[data-theme="dark"] .hr-dept-card,
  body[data-theme="dark"] .hr-finance-card,
  body[data-theme="dark"] .hr-loan-card,
  body[data-theme="dark"] .hr-payroll-detail-card,
  body[data-theme="dark"] .hr-detail-att-table-wrap {
    background: var(--hr-surface-soft);
    border-color: #334651;
  }

  body[data-theme="dark"] .hr-att-table td,
  body[data-theme="dark"] .hr-detail-att-table td,
  body[data-theme="dark"] .hr-mini-table td,
  body[data-theme="dark"] .hr-info-row,
  body[data-theme="dark"] .hr-loan-row {
    border-color: var(--hr-line);
    color: var(--hr-text);
  }

  body[data-theme="dark"] .hr-att-row:hover td,
  body[data-theme="dark"] .hr-rail-item.selected,
  body[data-theme="dark"] .hr-rail-item:hover,
  body[data-theme="dark"] .hr-bank-ledger-item:hover,
  body[data-theme="dark"] .hr-bank-ledger-item.selected,
  body[data-theme="dark"] .hr-bank-card:hover,
  body[data-theme="dark"] .hr-bank-card.selected,
  body[data-theme="dark"] .hr-att-menu button:hover,
  body[data-theme="dark"] .hr-btn.hr-btn-ghost:hover,
  body[data-theme="dark"] .hr-icon-btn:hover {
    background: var(--hr-primary-soft);
  }

  body[data-theme="dark"] .hr-field input,
  body[data-theme="dark"] .hr-field select,
  body[data-theme="dark"] .hr-field textarea,
  body[data-theme="dark"] .hr-date-stepper input,
  body[data-theme="dark"] .hr-month-nav input,
  body[data-theme="dark"] .hr-mini-input,
  body[data-theme="dark"] .hr-finance-card-actions input,
  body[data-theme="dark"] .hr-bank-filter-controls select,
  body[data-theme="dark"] .hr-bank-filter-controls input,
  body[data-theme="dark"] .hr-payroll-toolbar select,
  body[data-theme="dark"] .hr-detail-att-input,
  body[data-theme="dark"] .ot-hrs-input,
  body[data-theme="dark"] .ot-time-input select,
  body[data-theme="dark"] .ot-rate-input select,
  body[data-theme="dark"] .ot-fixed-input {
    background: var(--hr-input);
    border-color: #334651;
    color: var(--hr-text);
  }

  body[data-theme="dark"] .hr-field input::placeholder,
  body[data-theme="dark"] .hr-field textarea::placeholder,
  body[data-theme="dark"] .hr-mini-input::placeholder {
    color: #7f919b;
  }

  body[data-theme="dark"] .hr-mini-input:disabled {
    background: #18262d;
    color: #7f919b;
  }

  body[data-theme="dark"] .hr-btn,
  body[data-theme="dark"] .hr-icon-btn,
  body[data-theme="dark"] .hr-att-btn,
  body[data-theme="dark"] .hr-att-more-btn,
  body[data-theme="dark"] .hr-att-menu {
    background: var(--hr-surface);
    border-color: #334651;
    color: var(--hr-text);
  }

  body[data-theme="dark"] .hr-btn.hr-btn-primary {
    background: linear-gradient(135deg, #008069 0%, #00a884 100%);
    border-color: rgba(94,234,212,0.35);
    color: #fff;
  }

  body[data-theme="dark"] .hr-btn.hr-btn-primary:hover {
    background: linear-gradient(135deg, #00715f 0%, #009a79 100%);
    border-color: rgba(94,234,212,0.48);
  }

  body[data-theme="dark"] .hr-btn.hr-btn-ghost,
  body[data-theme="dark"] .hr-icon-btn {
    background: #202c33;
    border-color: #334651;
    color: #e9edef;
  }

  body[data-theme="dark"] .hr-btn.hr-btn-outline-danger,
  body[data-theme="dark"] .hr-icon-btn.danger {
    background: rgba(239,68,68,0.12);
    border-color: rgba(248,113,113,0.35);
    color: #f87171;
  }

  body[data-theme="dark"] .hr-pill.green,
  body[data-theme="dark"] .hr-bank-filter-totals .in {
    background: rgba(0,168,132,0.18);
    color: #5eead4;
  }

  body[data-theme="dark"] .hr-pill.amber {
    background: rgba(245,158,11,0.18);
    color: #fbbf24;
  }

  body[data-theme="dark"] .hr-pill.blue {
    background: rgba(59,130,246,0.18);
    color: #93c5fd;
  }

  body[data-theme="dark"] .hr-pill.violet {
    background: rgba(139,92,246,0.2);
    color: #c4b5fd;
  }

  body[data-theme="dark"] .hr-pill.rose,
  body[data-theme="dark"] .hr-bank-filter-totals .out {
    background: rgba(244,63,94,0.18);
    color: #fda4af;
  }

  body[data-theme="dark"] .hr-pill.slate,
  body[data-theme="dark"] .hr-bank-view-hint {
    background: rgba(148,163,184,0.14);
    border-color: #3b4f5a;
    color: #cbd5e1;
  }

  body[data-theme="dark"] .hr-metric-card.blue svg { background: rgba(59,130,246,0.18); color: #93c5fd; }
  body[data-theme="dark"] .hr-metric-card.green svg { background: rgba(0,168,132,0.2); color: #5eead4; }
  body[data-theme="dark"] .hr-metric-card.violet svg { background: rgba(139,92,246,0.2); color: #c4b5fd; }
  body[data-theme="dark"] .hr-metric-card.amber svg { background: rgba(245,158,11,0.18); color: #fbbf24; }
  body[data-theme="dark"] .hr-metric-card.rose svg { background: rgba(244,63,94,0.18); color: #fda4af; }
  body[data-theme="dark"] .hr-metric-card.slate svg { background: rgba(148,163,184,0.16); color: #cbd5e1; }

  body[data-theme="dark"] .hr-amount.in,
  body[data-theme="dark"] .hr-footer-balance.settled,
  body[data-theme="dark"] .hr-balance-chip.settled {
    color: #5eead4;
  }

  body[data-theme="dark"] .hr-amount.out,
  body[data-theme="dark"] .hr-overdue,
  body[data-theme="dark"] .hr-footer-balance.due,
  body[data-theme="dark"] .hr-balance-chip.due,
  body[data-theme="dark"] .hr-rail-item b.due {
    color: #fb7185;
  }

  body[data-theme="dark"] .hr-modal-backdrop {
    background: rgba(3,12,17,0.72);
  }

  body[data-theme="dark"] .hr-modal {
    background: var(--hr-bg);
    border: 1px solid var(--hr-line);
    box-shadow: 0 28px 70px rgba(0,0,0,0.45);
  }

  /* ── Nav tabs ── */
  .hr-skeleton {
    display: block;
    max-width: 100%;
    border-radius: 6px;
    background: linear-gradient(90deg, #eef2f7 0%, #f8fafc 42%, #e7edf5 78%);
    background-size: 220% 100%;
    animation: hrSkeletonShimmer 1.25s ease-in-out infinite;
  }
  .hr-skeleton-page {
    min-height: 360px;
  }
  .hr-skeleton-tabs .hr-nav-tab {
    cursor: default;
  }
  .hr-skeleton-tab.active {
    background: #ccfbf1;
    border-color: #99f6e4;
    color: inherit;
  }
  .hr-skeleton-icon {
    width: 16px;
    height: 16px;
    border-radius: 5px;
  }
  .hr-skeleton-section {
    overflow: hidden;
  }
  .hr-skeleton-staff {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .hr-skeleton-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .hr-skeleton-table th,
  .hr-skeleton-table td {
    pointer-events: none;
  }
  @keyframes hrSkeletonShimmer {
    0% { background-position: 120% 0; }
    100% { background-position: -120% 0; }
  }

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
    background: linear-gradient(135deg, #0b6f68 0%, #0d9488 100%);
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
  .hr-att-row:hover td { background: var(--hr-primary-soft); }
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
  .hr-payable-amount {
    color: #e11d48;
    font-weight: 700;
  }
  .hr-balance-stack {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 3px;
  }
  .hr-balance-stack small {
    color: #16a34a;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.25;
  }
  .hr-readonly-field {
    min-height: 46px;
    display: flex;
    align-items: center;
    border: 1.5px solid var(--hr-line);
    border-radius: 7px;
    background: #f8fafc;
    color: var(--app-text);
    padding: 4px 12px;
    font-size: 14px;
    font-weight: 700;
  }
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
  .hr-att-btn:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    background: #f8fafc;
  }
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
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
  }
  .hr-btn.hr-btn-primary {
    background: linear-gradient(135deg, var(--hr-primary-dark) 0%, var(--hr-primary) 100%);
    border-color: var(--hr-primary);
    color: #fff;
    box-shadow: 0 8px 18px rgba(13,148,136,0.18);
  }
  .hr-btn.hr-btn-primary:hover { background: var(--hr-primary-dark); border-color: var(--hr-primary-dark); }
  .hr-btn.hr-btn-ghost { background: var(--hr-bg); }
  .hr-btn.hr-btn-ghost:hover {
    background: var(--hr-primary-soft);
    border-color: var(--hr-primary-border);
    color: var(--hr-primary);
  }
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
    transition: background 0.16s ease, border-color 0.16s ease, color 0.16s ease;
  }
  .hr-icon-btn.danger { color: #dc2626; border-color: #fecaca; background: #fef2f2; }
  .hr-icon-btn:hover {
    background: var(--hr-primary-soft);
    border-color: var(--hr-primary-border);
    color: var(--hr-primary);
  }

  /* ── Detail layout ── */
  .hr-detail-layout {
    display: grid;
    grid-template-columns: 398px minmax(0,1fr);
    border: 1px solid #d8d8de;
    border-radius: 8px;
    background: var(--hr-bg);
    min-height: calc(100vh - 118px);
    overflow: visible;
  }
  .hr-detail-rail {
    border-right: 1px solid var(--hr-line);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    align-self: start;
    max-height: calc(100vh - 118px);
    background: var(--hr-bg);
    z-index: 2;
  }
  .hr-rail-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 17px 18px;
    border-bottom: 1px solid var(--hr-line);
  }
  .hr-rail-head h2 { margin: 0; font-size: 20px; font-weight: 500; }
  .hr-rail-scroll { flex: 1; min-height: 0; overflow-y: auto; }
  .hr-rail-item {
    width: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 6px;
    padding: 11px 18px;
    border: 0;
    border-bottom: 1px solid var(--hr-line);
    background: transparent;
    color: var(--app-text);
    text-align: left;
    cursor: pointer;
    min-height: 68px;
  }
  .hr-rail-item strong { display: block; font-weight: 400; font-size: 14px; line-height: 1.25; }
  .hr-rail-item small { display: inline-flex; align-items: center; gap: 7px; font-size: 15px; color: var(--hr-muted); margin-top: 6px; font-weight: 700; }
  .hr-rail-item small svg { width: 18px; height: 18px; }
  .hr-rail-item small.due { color: #0f172a; }
  .hr-rail-item small.due svg { color: #ef2b3a; stroke-width: 2.3; }
  .hr-rail-item small.settled { color: #0f172a; }
  .hr-rail-item small.settled svg { color: #17c63a; stroke-width: 2.3; }
  .hr-rail-item.selected, .hr-rail-item:hover { background: var(--hr-primary-soft); }

  /* ── Detail main ── */
  .hr-detail-main { display: flex; flex-direction: column; min-width: 0; }
  .hr-detail-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 19px 26px;
    border-bottom: 1px solid var(--hr-line);
    gap: 12px;
    flex-wrap: wrap;
  }
  .hr-detail-title { display: flex; align-items: center; gap: 12px; }
  .hr-detail-title h1 { margin: 0; font-size: 20px; font-weight: 500; }
  .hr-split-action { display: inline-flex; align-items: stretch; border-radius: 5px; overflow: hidden; }
  .hr-split-action .hr-btn { border-radius: 0; min-width: 202px; min-height: 37px; justify-content: center; }
  .hr-split-action .hr-split-caret { min-width: 39px; width: 39px; padding: 0; border-left-color: rgba(255,255,255,0.55); }
  .hr-detail-tabbar {
    min-height: 58px;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
    border-bottom: 1px solid var(--hr-line);
  }
  .hr-detail-tabs {
    display: flex;
    align-items: stretch;
    min-width: min(668px, 100%);
  }
  .hr-detail-tabs button {
    min-width: 167px;
    min-height: 58px;
    border: 0;
    border-right: 1px solid var(--hr-line);
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--hr-muted);
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
  }
  .hr-detail-tabs button.active { color: var(--hr-primary); border-bottom-color: var(--hr-primary); background: var(--hr-primary-soft); font-weight: 500; }
  .hr-detail-tab-actions { display: flex; align-items: center; gap: 10px; padding: 10px 31px 10px 10px; }
  .hr-detail-tab-actions .hr-btn { min-width: 125px; justify-content: center; }
  .hr-detail-body { padding: 26px 26px 52px; flex: 1; overflow: visible; }
  .hr-detail-month-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    flex-wrap: wrap;
    gap: 10px;
  }
  .hr-detail-month-bar h3 { margin: 0; font-size: 17px; font-weight: 600; }
  .payroll-month-bar { margin-bottom: 18px; }
  .payroll-month-bar h3 { font-size: 17px; font-weight: 400; }
  .hr-month-pill-nav {
    width: 320px;
    min-height: 39px;
    display: grid;
    grid-template-columns: 44px 1fr 44px;
    border: 1px solid var(--hr-line);
    border-radius: 5px;
    overflow: hidden;
  }
  .hr-month-pill-nav .hr-icon-btn {
    width: auto;
    height: 37px;
    border: 0;
    border-radius: 0;
    color: #66839f;
  }
  .hr-month-pill {
    border: 0;
    background: var(--hr-bg);
    color: #2d333b;
    font-size: 14px;
    cursor: pointer;
  }
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
  .hr-detail-payroll { display: flex; flex-direction: column; gap: 0; min-height: 630px; position: relative; }
  .hr-payroll-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .hr-payroll-toolbar select { min-height: 36px; border: 1.5px solid var(--hr-line); border-radius: 7px; background: var(--hr-bg); color: var(--app-text); padding: 4px 10px; }
  .hr-cycle-caption { font-size: 12px; color: var(--hr-muted); font-weight: 600; }
  .hr-payroll-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .hr-payroll-detail-card { border: 1px solid var(--hr-line); border-radius: 8px; padding: 14px; }
  .hr-payroll-detail-card h4 { margin: 0 0 10px; font-size: 15px; font-weight: 600; }
  .wide-action { width: 100%; margin-top: 12px; justify-content: center; }
  .hr-payroll-ledger {
    border: 1px solid var(--hr-line);
    min-height: 550px;
    background: var(--hr-bg);
  }
  .hr-payroll-ledger-row {
    min-height: 50px;
    display: grid;
    grid-template-columns: 1fr 180px;
    align-items: center;
    border-bottom: 1px solid var(--hr-line);
    padding: 0 22px 0 19px;
    color: #2d333b;
    font-size: 14px;
  }
  .hr-payroll-ledger-row.cycle {
    min-height: 51px;
    background: #fafbff;
    color: #6784a5;
  }
  .hr-payroll-ledger-row strong { font-weight: 600; }
  .hr-payroll-ledger-row b { justify-self: end; font-weight: 700; }
  .hr-payroll-ledger-row.child { padding-left: 32px; }
  .hr-payroll-ledger-row.child span { color: #30343b; }
  .hr-payroll-footnote {
    align-self: flex-end;
    color: #6d87a9;
    font-size: 12px;
    margin-top: 8px;
  }
  .hr-generate-inline { margin: 18px; }
  .hr-staff-info-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 70px;
    row-gap: 28px;
    padding: 16px 0 0;
    max-width: 940px;
  }
  .hr-staff-info-item { display: grid; gap: 14px; }
  .hr-staff-info-item span {
    color: #55779b;
    font-size: 14px;
    font-weight: 400;
  }
  .hr-staff-info-item strong {
    color: #0f172a;
    font-size: 14px;
    font-weight: 400;
  }

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
  .hr-form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .hr-form-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; }
  .hr-span2 { grid-column: 1 / -1; }
  .hr-bank-details-toggle { display: flex; align-items: center; justify-content: flex-start; }
  .hr-shift-preview {
    display: grid;
    gap: 3px;
    align-self: end;
    min-height: 48px;
    padding: 7px 9px;
    border: 1px solid var(--hr-line);
    border-radius: 7px;
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
  .hr-field { display: grid; gap: 4px; }
  .hr-field span { font-size: 11px; font-weight: 600; color: var(--hr-muted); }
  .hr-field input, .hr-field select, .hr-field textarea {
    width: 100%;
    min-height: 32px;
    border: 1.5px solid var(--hr-line);
    border-radius: 6px;
    background: var(--hr-bg);
    color: var(--app-text);
    padding: 5px 9px;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }
  .hr-field textarea {
    min-height: 74px;
    resize: vertical;
    line-height: 1.35;
  }
  .hr-field-label { font-size: 11px; font-weight: 600; color: var(--hr-muted); display: block; margin-bottom: 5px; }
  .hr-form-actions-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; }
  .hr-check-label { display: flex; align-items: center; gap: 8px; font-size: 13px; }
  .hr-day-checks { display: flex; gap: 6px; flex-wrap: wrap; }
  .hr-day-check { display: inline-flex; align-items: center; gap: 5px; min-height: 28px; padding: 0 8px; border: 1.5px solid var(--hr-line); border-radius: 6px; background: var(--hr-bg); font-size: 12px; cursor: pointer; }
  .hr-day-check.active { border-color: var(--hr-primary); background: rgba(79,70,229,0.08); color: var(--hr-primary); font-weight: 600; }
  .hr-day-check input { display: none; }
  .hr-required { color: #e11d48; }
  .hr-salary-preview {
    border: 1px solid var(--hr-line);
    border-radius: 7px;
    background: #f8fafc;
    padding: 8px 10px;
  }
  .hr-salary-preview > span {
    display: block;
    color: var(--hr-muted);
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 6px;
  }
  .hr-salary-preview div {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .hr-salary-preview strong {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    border: 1px solid var(--hr-line);
    border-radius: 7px;
    background: #fff;
    padding: 0 8px;
    font-size: 12px;
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

  /* Self service HR */
  .hr-self-service { display: flex; flex-direction: column; gap: 16px; padding: 0; overflow: hidden; }
  .hr-self-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 22px 24px;
    border-bottom: 1px solid var(--hr-line);
    background:
      linear-gradient(135deg, rgba(13,148,136,0.12) 0%, rgba(13,148,136,0.03) 52%, rgba(255,255,255,0) 100%),
      var(--hr-bg);
  }
  .hr-self-title { display: grid; gap: 4px; }
  .hr-self-title span,
  .hr-self-period span,
  .hr-self-card-head span {
    color: var(--hr-muted);
    font-size: 12px;
    font-weight: 700;
  }
  .hr-self-title h1 { margin: 0; color: var(--app-text); font-size: 24px; font-weight: 750; letter-spacing: 0; }
  .hr-self-title p { margin: 0; color: var(--hr-muted); font-size: 13px; }
  .hr-self-period {
    display: grid;
    grid-template-columns: auto 44px minmax(180px, 220px) 44px;
    align-items: center;
    gap: 8px;
  }
  .hr-self-period input {
    min-height: 38px;
    border: 1.5px solid var(--hr-line);
    border-radius: 8px;
    background: var(--hr-bg);
    color: var(--app-text);
    padding: 4px 10px;
    font-size: 14px;
  }
  .hr-self-overview {
    display: grid;
    grid-template-columns: minmax(240px, 1.35fr) repeat(4, minmax(160px, 1fr));
    gap: 12px;
    padding: 0 24px;
  }
  .hr-self-salary-card,
  .hr-self-stat {
    border: 1px solid var(--hr-line);
    border-radius: 8px;
    background: var(--hr-bg);
    min-height: 96px;
  }
  .hr-self-salary-card {
    padding: 16px;
    background: linear-gradient(135deg, var(--hr-primary-dark) 0%, var(--hr-primary) 100%);
    border-color: transparent;
    color: #fff;
  }
  .hr-self-salary-card span,
  .hr-self-salary-card small { display: block; color: rgba(255,255,255,0.78); font-size: 12px; font-weight: 700; }
  .hr-self-salary-card strong { display: block; margin: 8px 0 5px; color: #fff; font-size: 26px; font-weight: 800; }
  .hr-self-stat {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    grid-template-rows: 1fr 1fr;
    align-items: center;
    column-gap: 10px;
    padding: 13px;
  }
  .hr-self-stat svg {
    grid-row: 1 / 3;
    width: 38px;
    height: 38px;
    padding: 8px;
    border-radius: 8px;
  }
  .hr-self-stat span { color: var(--hr-muted); font-size: 12px; font-weight: 700; align-self: end; }
  .hr-self-stat strong { color: var(--app-text); font-size: 18px; font-weight: 800; align-self: start; white-space: nowrap; }
  .hr-self-stat.green svg { background: #dcfce7; color: #16a34a; }
  .hr-self-stat.blue svg { background: #dbeafe; color: #1d4ed8; }
  .hr-self-stat.amber svg { background: #fef3c7; color: #b45309; }
  .hr-self-stat.rose svg { background: #ffe4e6; color: #be123c; }
  .hr-self-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 14px;
    align-items: start;
    padding: 0 24px 24px;
  }
  .hr-self-grid .hr-mini-card {
    overflow: hidden;
    border-radius: 8px;
    padding: 16px;
  }
  .hr-self-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }
  .hr-self-card-head h4 { margin: 0 0 3px; font-size: 16px; font-weight: 750; }
  .hr-self-table-scroll {
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    border: 1px solid var(--hr-line);
    border-radius: 8px;
  }
  .hr-self-summary-scroll {
    margin-bottom: 10px;
  }
  .hr-self-table-scroll .hr-mini-table {
    margin-top: 0;
  }
  .hr-self-payroll-table { min-width: 760px; }
  .hr-self-attendance-table { min-width: 640px; }
  .hr-self-service .hr-summary-strip {
    border: 0;
    border-radius: 0;
    margin-bottom: 0;
    overflow: hidden;
    min-width: 640px;
  }
  .hr-self-service .hr-mini-table th,
  .hr-self-service .hr-mini-table td {
    white-space: nowrap;
  }

  /* ── Tools panel ── */
  .hr-tools-panel { padding: 0; }
  .hr-tools-panel h3 { margin: 0 0 3px; font-size: 15px; font-weight: 600; }
  .hr-tools-panel p { margin: 0 0 10px; font-size: 12px; color: var(--hr-muted); }

  /* ── Department list ── */
  .hr-dept-list { margin-top: 14px; display: grid; gap: 8px; }
  .hr-dept-card { border: 1px solid var(--hr-line); border-radius: 7px; padding: 10px; }
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
    background: var(--hr-primary-soft);
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
    position: sticky;
    top: 0;
    align-self: start;
    max-height: 100vh;
    overflow: hidden;
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
    max-height: calc(100vh - 204px);
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
    background: var(--hr-primary-soft);
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
    background: #ccfbf1;
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
    background: #ccfbf1;
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
  .staff-tx-filter-bar {
    padding: 0 0 12px;
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
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
    animation: appModalBackdropIn 0.32s ease-out both;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
  }
  .hr-modal {
    width: min(700px, 94vw);
    max-height: 88vh;
    overflow-y: auto;
    border-radius: 8px;
    background: var(--hr-bg);
    box-shadow: 0 16px 44px rgba(15,23,42,0.22);
    padding: 14px;
    animation: appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  .hr-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .hr-modal-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
  .hr-modal-actions { display: flex; justify-content: flex-end; gap: 7px; }
  .small-money-modal { width: min(420px, 94vw); }
  .payment-modal { width: min(560px, 94vw); }
  .hr-payment-direction {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .hr-payment-choice {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 34px;
    padding: 0 12px;
    border: 1.5px solid var(--hr-line);
    border-radius: 7px;
    background: var(--hr-bg);
    color: var(--hr-muted);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
  }
  .hr-payment-choice input {
    width: 14px;
    height: 14px;
    margin: 0;
    accent-color: var(--hr-primary);
  }
  .hr-payment-choice.active {
    border-color: var(--hr-primary-border);
    background: var(--hr-primary-soft);
    color: var(--hr-primary);
  }
  .hr-payment-preview {
    border: 1px solid var(--hr-line);
    border-radius: 7px;
    background: #fbfdff;
    padding: 4px 10px;
  }

  /* ── Overtime modal ── */
  .ot-modal { width: min(500px, 94vw); }
  .ot-info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 10px; border: 1px solid var(--hr-line); border-radius: 7px; margin-bottom: 10px; }
  .ot-info-row span { display: block; font-size: 11px; color: var(--hr-muted); margin-bottom: 3px; }
  .ot-info-row strong { font-size: 13px; font-weight: 600; }
  .ot-type-row { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
  .ot-radio { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }
  .ot-radio input { accent-color: var(--hr-primary); }
  .ot-hours-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .hr-muted-label { font-size: 11px; font-weight: 600; color: var(--hr-muted); display: block; margin-bottom: 5px; }
  .ot-time-input { display: flex; align-items: center; gap: 6px; font-size: 13px; }
  .ot-hrs-input { width: 54px; min-height: 32px; border: 1.5px solid var(--hr-line); border-radius: 6px; padding: 4px 8px; text-align: center; font-size: 13px; background: var(--hr-bg); color: var(--app-text); }
  .ot-colon { font-size: 18px; font-weight: 600; }
  .ot-time-input select { min-height: 32px; border: 1.5px solid var(--hr-line); border-radius: 6px; padding: 4px 8px; background: var(--hr-bg); color: var(--app-text); }
  .ot-rate-input { display: flex; align-items: center; gap: 8px; }
  .ot-rate-input select { flex: 1; min-height: 32px; border: 1.5px solid var(--hr-line); border-radius: 6px; padding: 4px 8px; background: var(--hr-bg); color: var(--app-text); }
  .ot-rate-value { font-size: 13px; font-weight: 600; white-space: nowrap; padding: 5px 8px; border: 1.5px solid var(--hr-line); border-radius: 6px; }
  .ot-fixed-row { margin-bottom: 10px; }
  .ot-fixed-input { width: 100%; min-height: 32px; border: 1.5px solid var(--hr-line); border-radius: 6px; padding: 4px 9px; background: var(--hr-bg); color: var(--app-text); font-size: 13px; margin-top: 5px; }
  .ot-total { padding: 9px 10px; background: #f8fafc; border-radius: 7px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .ot-total span { font-size: 12px; color: var(--hr-muted); }
  .ot-total strong { font-size: 14px; font-weight: 600; }

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

  body[data-theme="dark"] .hr-bank-ledger-detail,
  body[data-theme="dark"] .hr-bank-account-summary,
  body[data-theme="dark"] .hr-bank-filter-bar,
  body[data-theme="dark"] .hr-bank-ledger-table,
  body[data-theme="dark"] .hr-salary-preview,
  body[data-theme="dark"] .hr-shift-preview {
    background: var(--hr-bg);
    border-color: var(--hr-line);
  }

  body[data-theme="dark"] .hr-bank-account-summary,
  body[data-theme="dark"] .hr-salary-preview,
  body[data-theme="dark"] .hr-shift-preview {
    background: var(--hr-surface-soft);
    border-color: #334651;
  }

  body[data-theme="dark"] .hr-bank-ledger-table.hr-finance-table-wrap {
    background: var(--hr-bg);
    border-color: var(--hr-line);
  }

  body[data-theme="dark"] .hr-bank-ledger-table .hr-att-table,
  body[data-theme="dark"] .hr-bank-ledger-table .bank-tx-table {
    background: var(--hr-bg);
    color: var(--hr-text);
  }

  body[data-theme="dark"] .hr-bank-ledger-table .hr-att-table th,
  body[data-theme="dark"] .hr-bank-ledger-table .bank-tx-table th {
    background: var(--hr-surface-soft);
    border-color: var(--hr-line);
    color: #d7e2e8;
  }

  body[data-theme="dark"] .hr-bank-ledger-table .hr-att-table td,
  body[data-theme="dark"] .hr-bank-ledger-table .bank-tx-table td {
    background: var(--hr-bg);
    border-color: var(--hr-line);
    color: var(--hr-text);
  }

  body[data-theme="dark"] .hr-bank-ledger-table .hr-att-table tbody tr:hover td,
  body[data-theme="dark"] .hr-bank-ledger-table .bank-tx-table tbody tr:hover td {
    background: var(--hr-primary-soft);
  }

  body[data-theme="dark"] .hr-bank-account-summary span,
  body[data-theme="dark"] .hr-bank-account-summary small,
  body[data-theme="dark"] .hr-salary-preview > span,
  body[data-theme="dark"] .hr-shift-preview span,
  body[data-theme="dark"] .hr-shift-preview small {
    color: var(--hr-muted);
  }

  body[data-theme="dark"] .hr-bank-account-summary strong,
  body[data-theme="dark"] .hr-salary-preview strong,
  body[data-theme="dark"] .hr-shift-preview strong {
    color: var(--hr-text);
  }

  body[data-theme="dark"] .hr-self-hero {
    background:
      linear-gradient(135deg, rgba(0,168,132,0.16) 0%, rgba(0,168,132,0.05) 56%, rgba(32,44,51,0) 100%),
      var(--hr-bg);
  }

  body[data-theme="dark"] .hr-self-salary-card {
    background: linear-gradient(135deg, #00715f 0%, #00a884 100%);
  }

  body[data-theme="dark"] .hr-self-stat,
  body[data-theme="dark"] .hr-self-grid .hr-mini-card {
    background: var(--hr-surface-soft);
    border-color: #334651;
  }

  body[data-theme="dark"] .hr-salary-preview strong {
    background: var(--hr-surface);
    border-color: #334651;
  }

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
    .hr-bank-ledger-rail { position: static; max-height: none; overflow: visible; border-right: 0; border-bottom: 1px solid var(--hr-line); }
    .hr-bank-ledger-list { max-height: none; }
    .hr-bank-account-summary { grid-template-columns: 1fr; align-items: stretch; }
    .hr-self-hero { flex-direction: column; align-items: stretch; }
    .hr-self-period { grid-template-columns: auto 44px minmax(0, 1fr) 44px; }
    .hr-self-overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .hr-self-salary-card { grid-column: 1 / -1; }
    .hr-self-grid { grid-template-columns: 1fr; }
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
    .hr-payment-direction { align-items: stretch; flex-direction: column; }
    .hr-payment-choice { width: 100%; }
    .hr-self-hero { padding: 18px; }
    .hr-self-overview,
    .hr-self-grid { padding-left: 14px; padding-right: 14px; }
    .hr-self-overview { grid-template-columns: 1fr; }
    .hr-self-period { grid-template-columns: 38px minmax(0, 1fr) 38px; }
    .hr-self-period span { grid-column: 1 / -1; }
    .hr-att-table-wrap, .hr-detail-att-table-wrap { overflow-x: auto; overflow-y: visible; }
  }

  @media (max-width: 1280px) {
    .hr-att-table th,
    .hr-att-table td,
    .hr-detail-att-table th,
    .hr-detail-att-table td {
      padding-left: 14px;
      padding-right: 14px;
    }
    .hr-cash-bank-layout {
      grid-template-columns: 320px minmax(0, 1fr);
    }
  }

  @media (max-width: 1024px) {
    .hr-page { min-height: auto; }
    .hr-nav-tabs {
      flex-wrap: nowrap;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: thin;
    }
    .hr-nav-tab {
      flex: 0 0 auto;
      white-space: nowrap;
    }
    .hr-nav-tab.ml-auto { margin-left: 0; }
    .hr-att-table-wrap,
    .hr-detail-att-table-wrap,
    .hr-finance-table-wrap {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }
    .hr-section-topbar,
    .hr-date-bar,
    .hr-detail-topbar {
      padding-left: 16px;
      padding-right: 16px;
    }
  }

  @media (max-width: 760px) {
    .hr-page { margin-inline: -8px; }
    .hr-main-section,
    .hr-detail-layout {
      border-radius: 0;
      border-left: 0;
      border-right: 0;
    }
    .hr-section-topbar,
    .hr-date-bar,
    .hr-detail-topbar,
    .hr-detail-month-bar {
      align-items: stretch;
    }
    .hr-section-topbar h1,
    .hr-detail-title h1 {
      font-size: 18px;
      line-height: 1.25;
    }
    .hr-topbar-actions,
    .hr-date-nav-row,
    .hr-payroll-toolbar,
    .hr-bank-filter-controls,
    .hr-bank-filter-totals {
      width: 100%;
    }
    .hr-topbar-actions .hr-btn,
    .hr-date-nav-row .hr-btn,
    .hr-payroll-toolbar .hr-btn,
    .hr-payroll-toolbar select {
      flex: 1 1 150px;
      justify-content: center;
    }
    .hr-date-stepper {
      flex: 1 1 auto;
      min-width: 0;
    }
    .hr-date-stepper input,
    .hr-month-nav input {
      min-width: 0;
      width: 100%;
    }
    .hr-summary-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .hr-summary-cell {
      padding: 12px 14px;
      border-bottom: 1px solid var(--hr-line);
    }
    .hr-summary-cell:nth-child(2n) { border-right: 0; }
    .hr-summary-cell:nth-last-child(-n + 2) { border-bottom: 0; }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) {
      min-width: 0;
      display: block;
    }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) thead {
      display: none;
    }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tbody,
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tr,
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td {
      display: block;
      width: 100%;
    }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tbody {
      padding: 10px;
      background: #f8fafc;
    }
    body[data-theme="dark"] .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tbody {
      background: var(--hr-bg);
    }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tr {
      border: 1px solid var(--hr-line);
      border-radius: 8px;
      background: var(--hr-bg);
      overflow: hidden;
      margin-bottom: 10px;
    }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td {
      min-height: 44px;
      padding: 10px 12px;
      border-bottom: 1px solid var(--hr-line);
    }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td:last-child {
      border-bottom: 0;
    }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td::before {
      display: block;
      margin-bottom: 4px;
      color: var(--hr-muted);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td:nth-child(1)::before { content: "Staff"; }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td:nth-child(2)::before { content: "Mobile"; }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td:nth-child(3)::before { content: "Salary due"; }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td:nth-child(4)::before { content: "Balance"; }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td:nth-child(5)::before { content: "Attendance"; }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) td:nth-child(6)::before { content: "Payroll"; }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tfoot,
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tfoot tr,
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tfoot td {
      display: block;
      width: 100%;
    }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tfoot td {
      border: 0;
      padding: 8px 12px;
    }
    .hr-inline-att,
    .hr-hourly-action {
      justify-content: flex-start;
    }
    .hr-detail-body { padding: 14px; }
    .hr-detail-tabs { overflow-x: auto; }
    .hr-detail-tabs button {
      flex: 0 0 auto;
      min-width: 126px;
      padding: 0 12px;
    }
    .hr-modal-backdrop {
      align-items: flex-end;
      padding: 0;
    }
    .hr-modal,
    .payment-modal,
    .small-money-modal,
    .ot-modal,
    .bank-tx-modal {
      width: 100vw;
      max-height: 92vh;
      border-radius: 14px 14px 0 0;
      padding: 16px;
    }
    .hr-modal-actions { flex-wrap: wrap; }
    .hr-modal-actions .hr-btn {
      flex: 1 1 130px;
      justify-content: center;
    }
    .hr-bank-account-actions,
    .hr-finance-card-actions {
      justify-content: flex-start;
    }
  }

  @media (max-width: 640px) {
    .hr-metrics-row, .hr-finance-strip { grid-template-columns: 1fr; }
    .hr-summary-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .bank-tx-modal { width: 100vw; padding: 14px; }
  }

  @media (max-width: 420px) {
    .hr-page { margin-inline: -12px; }
    .hr-nav-tab {
      min-height: 38px;
      padding: 0 11px;
      font-size: 12px;
    }
    .hr-nav-tab svg {
      width: 14px;
      height: 14px;
    }
    .hr-section-topbar,
    .hr-date-bar,
    .hr-detail-topbar {
      padding: 12px;
    }
    .hr-summary-strip {
      grid-template-columns: 1fr;
    }
    .hr-summary-cell,
    .hr-summary-cell:nth-last-child(-n + 2) {
      border-right: 0;
      border-bottom: 1px solid var(--hr-line);
    }
    .hr-summary-cell:last-child { border-bottom: 0; }
    .hr-att-table:not(.bank-tx-table):not(.hr-skeleton-table) tbody {
      padding: 8px;
    }
    .hr-btn { min-height: 38px; }
    .hr-date-stepper .hr-icon-btn {
      width: 32px;
      height: 32px;
    }
    .hr-date-stepper input {
      padding-inline: 6px;
      font-size: 12px;
    }
    .hr-modal { padding: 14px; }
  }
`;
