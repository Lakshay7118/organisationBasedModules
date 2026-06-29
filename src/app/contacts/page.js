"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit,
  Eye,
  EyeOff,
  Globe2,
  Plus,
  Search,
  Tag,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { Country, State, City } from "country-state-city";
import API from "../utils/api";
import DepartmentFormModal, { emptyDepartmentForm } from "../componets/DepartmentFormModal";

const ROLE_FILTERS = [
  { value: "", label: "All roles" },
  { value: "user", label: "Users" },
  { value: "manager", label: "Managers" },
  { value: "super_admin", label: "Super Admin" },
];

const getContactRole = (contact) =>
  contact.loginUser?.role || contact.role || contact.createdBy?.role || "";

const isVisibleContact = (contact) =>
  getContactRole(contact) !== "super_to_super_admin";

const isTopAdminRole = (role) =>
  role === "super_to_super_admin" || role === "super_admin";

const PAYROLL_CYCLE_OPTIONS = [1, 7, 15];
const COUNTRY_OPTIONS = Country.getAllCountries();
const BREAK_OPTIONS = [
  { value: 30, label: "0.5 hr" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1.5 hr" },
  { value: 120, label: "2 hr" },
];
const HR_PERMISSION_OPTIONS = [
  { key: "canViewBanks", label: "Show banks tab" },
  { key: "canManageBanks", label: "Add/edit banks and deposits" },
  { key: "canMakePayments", label: "Make salary and bank payments" },
  { key: "canManageAdvances", label: "Show/manage advances" },
  { key: "canAddStaff", label: "Add staff" },
  { key: "canEditStaff", label: "Edit staff" },
  { key: "canDeleteStaff", label: "Delete staff" },
  { key: "canMarkAttendance", label: "Mark present/absent" },
  { key: "canGenerateSalarySlip", label: "Generate salary slip" },
];
const DEFAULT_HR_PERMISSIONS = HR_PERMISSION_OPTIONS.reduce((acc, option) => {
  acc[option.key] = true;
  return acc;
}, {});
const normalizeHrPermissions = (permissions = {}) =>
  HR_PERMISSION_OPTIONS.reduce((acc, option) => {
    acc[option.key] = permissions?.[option.key] !== undefined ? Boolean(permissions[option.key]) : true;
    return acc;
  }, {});

const localDate = (date = new Date()) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
};

const idOf = (item) => (item?._id || item?.id || "").toString();

const timeToMinutes = (time) => {
  if (!time || typeof time !== "string") return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (![hours, minutes].every(Number.isFinite)) return null;
  return hours * 60 + minutes;
};
const calculateWorkHours = (startTime, endTime) => {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return 0;
  const adjustedEnd = end < start ? end + 24 * 60 : end;
  return Math.round(((adjustedEnd - start) / 60) * 100) / 100;
};
const shiftsForDepartment = (department = {}) => {
  const source = Array.isArray(department.shifts) && department.shifts.length
    ? department.shifts
    : [department.shift || { name: "General", start: "09:00", end: "18:00", breakMinutes: 60 }];
  return source.map((shift) => ({
    _id: shift._id,
    name: shift.name || "General",
    start: shift.start || "09:00",
    end: shift.end || "18:00",
    breakMinutes: shift.breakMinutes ?? 60,
  }));
};
const shiftIdValue = (shift, index = 0) => idOf(shift) || `shift-${index}`;
const shiftWorkHours = (shift = {}) => Math.round(Math.max(0, calculateWorkHours(shift.start, shift.end) - (Number(shift.breakMinutes || 0) / 60)) * 100) / 100;
const shiftLabel = (shift = {}) => {
  const breakLabel = BREAK_OPTIONS.find((option) => Number(option.value) === Number(shift.breakMinutes))?.label;
  return `${shift.name || "General"}: ${shift.start || "--"} - ${shift.end || "--"}${breakLabel ? `, Break ${breakLabel}` : ""}`;
};

const DEFAULT_WORK_DAYS_PER_MONTH = 26;

const monthDates = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: count }, (_, index) => new Date(year, month, index + 1));
};

const workingDaysForDepartment = (department) => {
  const offDays = Array.isArray(department?.weeklyOffDays)
    ? department.weeklyOffDays.map(Number)
    : [0];
  const count = monthDates().filter((date) => !offDays.includes(date.getDay())).length;
  return count || DEFAULT_WORK_DAYS_PER_MONTH;
};

/* ---------- Utility: pageWrapper style ---------- */
const pageWrapStyle = (mobile) => ({
  width: "100%",
  height: "100%",
  minHeight: 0,
  background:
    "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
  padding: mobile ? "14px 10px" : "24px 28px 20px",
  fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
  overflow: "hidden",
  boxSizing: "border-box",
});

/* ---------- StatusBadge ---------- */
function StatusBadge({ status }) {
  const normalized = (status || "pending").toLowerCase();
  const colors = {
    approved: { bg: "#dcfce7", color: "#166534", dot: "#22c55e" },
    pending: { bg: "#fef3c7", color: "#92400e", dot: "#f59e0b" },
    rejected: { bg: "#fee2e2", color: "#991b1b", dot: "#ef4444" },
  };
  const s = colors[normalized] || colors.pending;
  const label = normalized
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: s.bg,
        color: s.color,
        borderRadius: 8,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

/* ---------- TagBadge ---------- */
function TagBadge({ label }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: "#ede9fe",
        color: "#7c3aed",
        borderRadius: 8,
        padding: "5px 10px",
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <Tag size={12} />
      {label}
    </span>
  );
}

function ActionIconButton({ label, tone = "default", children, ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      style={actionIconBtn(tone)}
      {...props}
    >
      {children}
    </button>
  );
}

function LoginAccessToggle({ contact, onToggle }) {
  const hasLogin = Boolean(contact.loginUser?._id);
  const isActive = contact.loginUser?.isActive !== false;

  return (
    <button
      type="button"
      onClick={() => hasLogin && onToggle(contact)}
      disabled={!hasLogin}
      aria-pressed={hasLogin ? isActive : undefined}
      title={hasLogin ? "Toggle login access" : "No login account exists"}
      style={{
        width: 92,
        height: 30,
        borderRadius: 999,
        border: "none",
        background: !hasLogin ? "#e5e7eb" : isActive ? "#d1fae5" : "#fee2e2",
        color: !hasLogin ? "#6b7280" : isActive ? "#065f46" : "#991b1b",
        cursor: hasLogin ? "pointer" : "not-allowed",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: isActive && hasLogin ? "flex-end" : "flex-start",
        padding: 3,
        gap: 4,
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
        opacity: hasLogin ? 1 : 0.75,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          flexShrink: 0,
          order: isActive && hasLogin ? 2 : 0,
        }}
      />
      <span style={{ flex: 1, textAlign: "center", lineHeight: 1 }}>
        {!hasLogin ? "No login" : isActive ? "Active" : "Inactive"}
      </span>
    </button>
  );
}

function ContactsDarkStyles() {
  return (
    <style>{`
      .contacts-page .contacts-table-row {
        transition: background 0.15s ease;
      }
      .contacts-page .contacts-table-row:hover {
        background: #fafbff !important;
      }
      body[data-theme="dark"] .contacts-page {
        background: #0b141a !important;
        color: #e9edef !important;
      }
      body[data-theme="dark"] .contacts-page .contacts-table-row:hover {
        background: #18242b !important;
      }
      body[data-theme="dark"] .contacts-page [style*="background: #fff"],
      body[data-theme="dark"] .contacts-page [style*="background:#fff"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(255, 255, 255)"] {
        background: #111b21 !important;
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .contacts-page [style*="background: #fafafa"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(250, 250, 250)"],
      body[data-theme="dark"] .contacts-page [style*="background: #f9fafb"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(249, 250, 251)"],
      body[data-theme="dark"] .contacts-page [style*="background: #f3f4f6"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(243, 244, 246)"],
      body[data-theme="dark"] .contacts-page [style*="background: #f0fdf4"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(240, 253, 244)"] {
        background: #202c33 !important;
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: #1a2233"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: rgb(26, 34, 51)"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: #111827"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: rgb(17, 24, 39)"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: #374151"],
      body[data-theme="dark"] .contacts-page :is(h1, h2, h3, h4, p, div, span, label, td, th, button, input, select)[style*="color: rgb(55, 65, 81)"] {
        color: #e9edef !important;
      }
      body[data-theme="dark"] .contacts-page :is(p, div, span, label, td, th, button)[style*="color: #6b7280"],
      body[data-theme="dark"] .contacts-page :is(p, div, span, label, td, th, button)[style*="color: rgb(107, 114, 128)"],
      body[data-theme="dark"] .contacts-page :is(p, div, span, label, td, th, button)[style*="color: #9ca3af"],
      body[data-theme="dark"] .contacts-page :is(p, div, span, label, td, th, button)[style*="color: rgb(156, 163, 175)"] {
        color: #aebac1 !important;
      }
      body[data-theme="dark"] .contacts-page th,
      body[data-theme="dark"] .contacts-page [style*="background: #f9fafb"][style*="position: sticky"],
      body[data-theme="dark"] .contacts-page [style*="background: rgb(249, 250, 251)"][style*="position: sticky"] {
        background: #202c33 !important;
        color: #00a884 !important;
      }
      body[data-theme="dark"] .contacts-page table,
      body[data-theme="dark"] .contacts-page tr,
      body[data-theme="dark"] .contacts-page td,
      body[data-theme="dark"] .contacts-page th,
      body[data-theme="dark"] .contacts-page [style*="border-bottom: 1px solid"],
      body[data-theme="dark"] .contacts-page [style*="border: 1px solid"],
      body[data-theme="dark"] .contacts-page [style*="border: 1.5px solid"] {
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .contacts-page input,
      body[data-theme="dark"] .contacts-page select {
        background: #202c33 !important;
        border-color: #2a3942 !important;
        color: #e9edef !important;
      }
      body[data-theme="dark"] .contacts-page input::placeholder {
        color: #8696a0 !important;
      }
      body[data-theme="dark"] .contacts-page button[style*="background: #fff"],
      body[data-theme="dark"] .contacts-page button[style*="background: rgb(255, 255, 255)"] {
        background: #202c33 !important;
        border-color: #2a3942 !important;
      }
      body[data-theme="dark"] .contacts-page .shimmer {
        background: linear-gradient(90deg, #1f2c34 25%, #2a3942 37%, #1f2c34 63%) !important;
        background-size: 200px 100% !important;
      }
    `}</style>
  );
}

/* ---------- AddContactModal ---------- */
function AddContactModal({
  onClose,
  onAdd,
  onAddStaff,
  onDepartmentsChange,
  availableTags,
  departments,
  defaultPayrollCycleDay,
  isSuperAdmin,
  hasHrAccess,
  userRole,
}) {
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    password: "",
    tagId: "",
    role: "user",
    hrPermissions: DEFAULT_HR_PERMISSIONS,
    employeeCode: "",
    department: "",
    shiftId: "",
    designation: "",
    salaryBasis: "monthly",
    monthlySalary: "",
    expectedHoursPerDay: 8,
    payrollCycleDay: defaultPayrollCycleDay || 1,
    joinDate: localDate(),
    status: "active",
    addressCountry: "IN",
    addressState: "",
    addressCity: "",
    houseAddress: "",
    addBankDetails: "no",
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    ifscCode: "",
    branch: "",
    upiId: "",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("contact");
  const [saving, setSaving] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
  const [departmentSaving, setDepartmentSaving] = useState(false);

  const states = useMemo(
    () => State.getStatesOfCountry(form.addressCountry || ""),
    [form.addressCountry]
  );
  const cities = useMemo(
    () =>
      form.addressCountry && form.addressState
        ? City.getCitiesOfState(form.addressCountry, form.addressState)
        : [],
    [form.addressCountry, form.addressState]
  );
  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find((country) => country.isoCode === form.addressCountry),
    [form.addressCountry]
  );
  const selectedState = useMemo(
    () => states.find((state) => state.isoCode === form.addressState),
    [states, form.addressState]
  );
  const selectedCity = useMemo(
    () => cities.find((city) => city.name === form.addressCity),
    [cities, form.addressCity]
  );

  const salaryLabel =
    form.salaryBasis === "hourly"
      ? "Hourly Rate"
      : form.salaryBasis === "daily"
        ? "Daily Salary"
        : "Monthly Salary";
  const salaryPreview = useMemo(() => {
    const amount = Math.max(0, Number(form.monthlySalary || 0));
    const selectedDepartment = departments.find((department) => idOf(department) === form.department);
    const selectedShifts = shiftsForDepartment(selectedDepartment || {});
    const selectedShift = selectedShifts.find((shift, index) => shiftIdValue(shift, index) === form.shiftId) || selectedShifts[0];
    const hours = shiftWorkHours(selectedShift || {}) || Math.max(0, Number(form.expectedHoursPerDay || 0)) || 8;
    const cycleDay = Number(form.payrollCycleDay || 1);
    const monthDayCount = monthDates().length;
    const workingDayCount = workingDaysForDepartment(selectedDepartment);
    const currency = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });

    if (form.salaryBasis === "hourly") {
      const daily = amount * hours;
      const monthly = daily * workingDayCount;
      return {
        title: "Hourly salary preview",
        helper: `Based on ${hours} hrs/day and ${workingDayCount} working days.`,
        items: [
          { label: "Hourly salary", value: currency.format(amount) },
          { label: "Daily estimate", value: currency.format(daily) },
          { label: "Monthly estimate", value: currency.format(monthly) },
        ],
      };
    }

    if (form.salaryBasis === "daily") {
      const hourly = hours > 0 ? amount / hours : 0;
      const monthly = amount * workingDayCount;
      return {
        title: "Daily salary preview",
        helper: `Based on ${hours} hrs/day and ${workingDayCount} working days.`,
        items: [
          { label: "Daily salary", value: currency.format(amount) },
          { label: "Hourly estimate", value: currency.format(hourly) },
          { label: "Monthly estimate", value: currency.format(monthly) },
        ],
      };
    }

    const daily = monthDayCount > 0 ? amount / monthDayCount : 0;
    const hourly = hours > 0 ? daily / hours : 0;
    return {
      title: "Monthly salary preview",
      helper: `Payroll cycle ${cycleDay} to ${cycleDay}; ${monthDayCount} salary days this month.`,
      items: [
        { label: "Monthly salary", value: currency.format(amount) },
        { label: "Daily estimate", value: currency.format(daily) },
        { label: "Hourly estimate", value: currency.format(hourly) },
      ],
    };
  }, [departments, form.department, form.expectedHoursPerDay, form.monthlySalary, form.payrollCycleDay, form.salaryBasis, form.shiftId]);
  const selectedDepartment = useMemo(
    () => departments.find((department) => idOf(department) === form.department) || null,
    [departments, form.department]
  );
  const selectedShifts = useMemo(() => shiftsForDepartment(selectedDepartment || {}), [selectedDepartment]);
  const selectedShift = useMemo(
    () => selectedShifts.find((shift, index) => shiftIdValue(shift, index) === form.shiftId) || selectedShifts[0] || null,
    [selectedShifts, form.shiftId]
  );

  const setFieldValue = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const handle = (key) => (e) => setFieldValue(key, e.target.value);
  const saveDepartment = async (event) => {
    event.preventDefault();
    const name = departmentForm.name.trim();
    if (!name) {
      setError("Department name is required.");
      return;
    }

    setDepartmentSaving(true);
    setError("");
    try {
      const shift = {
        name: (departmentForm.shifts || [departmentForm.shift])[0]?.name || "General",
        start: (departmentForm.shifts || [departmentForm.shift])[0]?.start || "09:00",
        end: (departmentForm.shifts || [departmentForm.shift])[0]?.end || "18:00",
        breakMinutes: Number((departmentForm.shifts || [departmentForm.shift])[0]?.breakMinutes || 0),
      };
      const payload = {
        name,
        description: departmentForm.description.trim(),
        shift,
        shifts: (departmentForm.shifts || [departmentForm.shift]).map((item) => ({
          name: item.name || "General",
          start: item.start || "09:00",
          end: item.end || "18:00",
          breakMinutes: Number(item.breakMinutes || 0),
        })),
        weeklyOffDays: departmentForm.weeklyOffDays.map(Number),
        leavePolicy: {
          paidLeaves: Number(departmentForm.leavePolicy.paidLeaves || 0),
          shortLeaves: Number(departmentForm.leavePolicy.shortLeaves || 0),
        },
      };
      const res = await API.post("/hr/departments", payload);
      const savedDepartment = res.data?.data;
      if (!savedDepartment) throw new Error("Department saved, but response was empty.");
      const firstShift = shiftsForDepartment(savedDepartment)[0];

      onDepartmentsChange?.((prev) => [savedDepartment, ...prev]);
      setForm((prev) => ({
        ...prev,
        department: idOf(savedDepartment),
        shiftId: firstShift ? shiftIdValue(firstShift, 0) : "",
        expectedHoursPerDay: shiftWorkHours(firstShift || {}) || prev.expectedHoursPerDay,
      }));
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.department;
        return next;
      });
      setDepartmentForm(emptyDepartmentForm);
      setShowDepartmentModal(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Could not add department.");
    } finally {
      setDepartmentSaving(false);
    }
  };
  const canConfigureHrPermissions = isSuperAdmin && ["manager", "hr"].includes(form.role);
  const toggleHrPermission = (key) => {
    setForm((prev) => ({
      ...prev,
      hrPermissions: {
        ...normalizeHrPermissions(prev.hrPermissions),
        [key]: !normalizeHrPermissions(prev.hrPermissions)[key],
      },
    }));
  };
  const contactColumns = hasHrAccess ? 2 : 1;
  const contactInputStyle = hasHrAccess ? compactInputStyle : inputStyle;
  const modalWidth = hasHrAccess && step === "staff" ? 920 : hasHrAccess ? 760 : 440;
  const roleOptions = useMemo(() => {
    if (userRole === "manager") {
      return [
        { value: "user", label: "User" },
        { value: "hr", label: "HR" },
      ];
    }
    if (userRole === "hr") {
      return [{ value: "user", label: "User" }];
    }
    if (isSuperAdmin) {
      return [
        { value: "user", label: "User" },
        ...(hasHrAccess ? [{ value: "hr", label: "HR" }] : []),
        { value: "manager", label: "Manager" },
        { value: "super_admin", label: "Super Admin" },
      ];
    }
    return [];
  }, [hasHrAccess, isSuperAdmin, userRole]);
  const canChooseRole = roleOptions.length > 1 || ["manager", "hr"].includes(userRole);
  const canSetPassword = isSuperAdmin || ["manager", "hr"].includes(userRole);

  const validateContactStep = () => {
    const nextErrors = {};
    const cleanMobile = form.mobile.replace(/\s/g, "").trim();
    const cleanName = form.name.trim();
    const cleanEmail = form.email.trim();

    if (!cleanName) nextErrors.name = "Name is required.";
    else if (!/^[a-zA-Z\s.'-]{2,60}$/.test(cleanName)) nextErrors.name = "Enter a valid name.";
    if (!cleanMobile) nextErrors.mobile = "Mobile number is required.";
    else if (!/^\d{10,15}$/.test(cleanMobile)) nextErrors.mobile = "Enter a valid mobile number with 10 to 15 digits.";
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) nextErrors.email = "Enter a valid email address.";
    if (canSetPassword && cleanEmail && !form.password) nextErrors.password = "Password is required when email is provided.";
    else if (form.password && form.password.length < 6) nextErrors.password = "Password must be at least 6 characters.";

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateStaffStep = () => {
    const nextErrors = {};
    const salaryAmount = Number(form.monthlySalary || 0);
    const dailyHours = Number(form.expectedHoursPerDay || 0);

    if (!form.employeeCode.trim()) nextErrors.employeeCode = "Employee code is required.";
    else if (!/^[a-zA-Z0-9-_/]{2,30}$/.test(form.employeeCode.trim())) {
      nextErrors.employeeCode = "Use letters, numbers, dash, slash, or underscore.";
    }
    if (!form.department) nextErrors.department = "Select a department.";
    if (salaryAmount <= 0) nextErrors.monthlySalary = `${salaryLabel} must be greater than 0.`;
    if (dailyHours <= 0) nextErrors.expectedHoursPerDay = "Daily work hours must be greater than 0.";
    if (!form.addressState) nextErrors.addressState = "Select a state.";
    if (!form.addressCity) nextErrors.addressCity = "Select a city.";
    if (!form.houseAddress.trim()) nextErrors.houseAddress = "House / street address is required.";
    else if (form.houseAddress.trim().length < 5) nextErrors.houseAddress = "Enter a complete address.";

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (step === "contact" && !validateContactStep()) {
      setError("");
      return;
    }
    if (hasHrAccess && step === "staff" && !validateStaffStep()) {
      setError("");
      return;
    }
    const cleanMobile = form.mobile.replace(/\s/g, "").trim();
    if (!/^\d{10,15}$/.test(cleanMobile))
      return setError("Enter a valid mobile number (10–15 digits).");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError("Enter a valid email address.");
    if (canSetPassword && form.email && !form.password)
      return setError("Password is required when email is provided.");
    if (form.password && form.password.length < 6)
      return setError("Password must be at least 6 characters.");
    setError("");
    const contact = {
      name: form.name.trim(),
      mobile: cleanMobile,
      email: form.email.trim() || null,
      password: form.password || undefined,
      tags: form.tagId ? [form.tagId] : [],
      role: form.role,
      ...(canConfigureHrPermissions ? { hrPermissions: normalizeHrPermissions(form.hrPermissions) } : {}),
    };

    if (hasHrAccess && step === "contact") {
      setFieldErrors({});
      setStep("staff");
      return;
    }

    setSaving(true);
    try {
      if (hasHrAccess) {
        await onAddStaff({
          contact,
          staff: {
            employeeCode: form.employeeCode,
            name: contact.name,
            phone: contact.mobile,
            email: contact.email || "",
            department: form.department || null,
            shiftId: form.shiftId || null,
            designation: form.designation,
            salaryBasis: form.salaryBasis,
            monthlySalary: Number(form.monthlySalary || 0),
            expectedHoursPerDay: shiftWorkHours(selectedShift || {}) || Number(form.expectedHoursPerDay || 8),
            payrollCycleDay: Number(form.payrollCycleDay || 1),
            joinDate: form.joinDate || localDate(),
            status: form.status,
            address: {
              countryCode: form.addressCountry || "",
              countryName: selectedCountry?.name || "",
              stateCode: form.addressState || "",
              stateName: selectedState?.name || "",
              cityName: selectedCity?.name || form.addressCity || "",
              houseAddress: form.houseAddress || "",
            },
            bankName: form.addBankDetails === "yes" ? form.bankName : "",
            accountHolderName: form.addBankDetails === "yes" ? form.accountHolderName : "",
            accountNumber: form.addBankDetails === "yes" ? form.accountNumber : "",
            ifscCode: form.addBankDetails === "yes" ? form.ifscCode : "",
            branch: form.addBankDetails === "yes" ? form.branch : "",
            upiId: form.addBankDetails === "yes" ? form.upiId : "",
          },
        });
      } else {
        await onAdd(contact);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to save contact.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlay}>
      <div style={modalShell(modalWidth)}>
        <div style={modalHeader}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2233" }}>
              {step === "staff" ? "Add Staff Details" : "Add Contact"}
            </h2>
            {hasHrAccess && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <span style={stepPill(step === "contact")}>1 Contact</span>
                <span style={stepPill(step === "staff")}>2 Staff</span>
              </div>
            )}
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={17} />
            ✕
          </button>
        </div>

        <div style={modalBody}>
        {error && (
          <p
            style={{
              color: "#e74c3c",
              fontSize: 13,
              marginBottom: 12,
              background: "#fdf0f0",
              padding: "8px 12px",
              borderRadius: 6,
            }}
          >
            {error}
          </p>
        )}

        {!isSuperAdmin && (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            <Clock3 size={15} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
            Your contact will be sent for <strong>admin approval</strong> before being visible.
          </div>
        )}

        {step === "contact" && (
          <div style={formGrid(contactColumns)}>
            <FormField label="Name" error={fieldErrors.name}>
              <input
                value={form.name}
                onChange={handle("name")}
                placeholder="Full name (optional)"
                style={contactInputStyle}
              />
            </FormField>

            <FormField label="Mobile Number *" error={fieldErrors.mobile}>
              <input
                value={form.mobile}
                onChange={handle("mobile")}
                placeholder="e.g. 919876543210"
                style={contactInputStyle}
              />
            </FormField>

            <FormField label="Email Address" hint={canSetPassword ? "(used for login)" : ""} error={fieldErrors.email}>
              <input
                value={form.email}
                onChange={handle("email")}
                placeholder="e.g. john@example.com"
                type="email"
                style={contactInputStyle}
              />
            </FormField>

            {canSetPassword && (
              <FormField label="Password" hint="(required if email is set)" error={fieldErrors.password}>
                <div style={{ position: "relative" }}>
                  <input
                    value={form.password}
                    onChange={handle("password")}
                    placeholder="Min. 6 characters"
                    type={showPassword ? "text" : "password"}
                    style={{ ...contactInputStyle, paddingRight: 40 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#9ca3af",
                      fontSize: 0,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </FormField>
            )}

            <FormField label="Tag">
              <select value={form.tagId} onChange={handle("tagId")} style={contactInputStyle}>
                <option value="">Select a tag</option>
                {availableTags.map((tag) => (
                  <option key={tag._id} value={tag._id}>
                    {tag.name || tag.tagName}
                  </option>
                ))}
              </select>
            </FormField>

            {canChooseRole && (
              <FormField label="Role">
                <select value={form.role} onChange={handle("role")} style={contactInputStyle}>
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            {canConfigureHrPermissions && (
              <div style={{ gridColumn: "1 / -1", marginTop: 4 }}>
                <label style={labelStyle}>HR Permissions</label>
                <div style={permissionGridStyle}>
                  {HR_PERMISSION_OPTIONS.map((permission) => {
                    const checked = normalizeHrPermissions(form.hrPermissions)[permission.key];
                    return (
                      <label key={permission.key} style={{ ...checkboxRow, marginBottom: 0 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleHrPermission(permission.key)}
                          style={checkboxInput}
                        />
                        <span style={checkboxLabel}>{permission.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {hasHrAccess && step === "staff" && (
          <div style={formGrid(3)}>
            <FormField label="Employee Code" error={fieldErrors.employeeCode}>
              <input value={form.employeeCode} onChange={handle("employeeCode")} placeholder="EMP-001" style={compactInputStyle} />
            </FormField>
            <div style={{ marginBottom: 10 }}>
              <div style={fieldLabelActionRow}>
                <span>Department</span>
                <button
                  type="button"
                  onClick={() => {
                    setDepartmentForm(emptyDepartmentForm);
                    setShowDepartmentModal(true);
                  }}
                  style={inlineAddDepartmentBtn}
                >
                  <Plus size={13} />
                  Add Department
                </button>
              </div>
              <select value={form.department} onChange={(e) => {
                const department = departments.find((item) => idOf(item) === e.target.value);
                const firstShift = shiftsForDepartment(department || {})[0];
                setFieldValue("department", e.target.value);
                setForm((prev) => ({
                  ...prev,
                  department: e.target.value,
                  shiftId: firstShift ? shiftIdValue(firstShift, 0) : "",
                  expectedHoursPerDay: shiftWorkHours(firstShift || {}) || prev.expectedHoursPerDay,
                }));
              }} style={compactInputStyle}>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={idOf(department)} value={idOf(department)}>
                    {department.name}
                  </option>
                ))}
              </select>
              {fieldErrors.department && <div style={fieldErrorStyle}>{fieldErrors.department}</div>}
            </div>
            {selectedDepartment && (
              <FormField label="Shift">
                <select value={form.shiftId || (selectedShift ? shiftIdValue(selectedShift, 0) : "")} onChange={(e) => {
                  const nextShift = selectedShifts.find((shift, index) => shiftIdValue(shift, index) === e.target.value);
                  setForm((prev) => ({ ...prev, shiftId: e.target.value, expectedHoursPerDay: shiftWorkHours(nextShift || {}) || prev.expectedHoursPerDay }));
                }} style={compactInputStyle}>
                  {selectedShifts.map((shift, index) => (
                    <option key={shiftIdValue(shift, index)} value={shiftIdValue(shift, index)}>{shiftLabel(shift)}</option>
                  ))}
                </select>
              </FormField>
            )}
            <FormField label="Designation">
              <input value={form.designation} onChange={handle("designation")} placeholder="Executive" style={compactInputStyle} />
            </FormField>
            <FormField label="Salary Basis">
              <select value={form.salaryBasis} onChange={handle("salaryBasis")} style={compactInputStyle}>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </FormField>
            <FormField label={salaryLabel} error={fieldErrors.monthlySalary}>
              <input type="number" min="0" value={form.monthlySalary} onChange={handle("monthlySalary")} placeholder="30000" style={compactInputStyle} />
            </FormField>
            <FormField label="Daily Work Hours" error={fieldErrors.expectedHoursPerDay}>
              <input type="number" min="0" step="0.5" value={shiftWorkHours(selectedShift || {}) || form.expectedHoursPerDay} onChange={handle("expectedHoursPerDay")} style={compactInputStyle} />
            </FormField>
            {form.salaryBasis === "monthly" && (
              <FormField label="Payroll Cycle">
                <select value={form.payrollCycleDay} onChange={handle("payrollCycleDay")} style={compactInputStyle}>
                  {PAYROLL_CYCLE_OPTIONS.map((day) => (
                    <option key={day} value={day}>
                      {day} to {day}
                    </option>
                  ))}
                </select>
              </FormField>
            )}
            <FormField label="Joining Date">
              <input type="date" value={form.joinDate} onChange={handle("joinDate")} style={compactInputStyle} />
            </FormField>
            <FormField label="Status">
              <select value={form.status} onChange={handle("status")} style={compactInputStyle}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="resigned">Resigned</option>
              </select>
            </FormField>
            <div style={salaryPreviewCard}>
              <div style={previewHeader}>
                <span style={previewEyebrow}>{salaryPreview.title}</span>
                <span style={previewMuted}>{salaryPreview.helper}</span>
              </div>
              {salaryPreview.items.map((item) => (
                <div key={item.label} style={previewTile}>
                  <strong style={previewValue}>{item.value}</strong>
                  <span style={previewMuted}>{item.label}</span>
                </div>
              ))}
            </div>
            <FormField label="Country">
              <select
                value={form.addressCountry}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, addressCountry: e.target.value, addressState: "", addressCity: "" }));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.addressState;
                    delete next.addressCity;
                    return next;
                  });
                }}
                style={compactInputStyle}
              >
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.isoCode} value={country.isoCode}>
                    {country.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="State" error={fieldErrors.addressState}>
              <select
                value={form.addressState}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, addressState: e.target.value, addressCity: "" }));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.addressState;
                    delete next.addressCity;
                    return next;
                  });
                }}
                style={compactInputStyle}
              >
                <option value="">Select state</option>
                {states.map((state) => (
                  <option key={state.isoCode} value={state.isoCode}>
                    {state.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="City" error={fieldErrors.addressCity}>
              <select value={form.addressCity} onChange={handle("addressCity")} style={compactInputStyle}>
                <option value="">Select city</option>
                {cities.map((city) => (
                  <option key={`${city.name}-${city.latitude}`} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="House / Street" wide error={fieldErrors.houseAddress}>
              <textarea value={form.houseAddress} onChange={handle("houseAddress")} rows={2} placeholder="Address" style={compactTextareaStyle} />
            </FormField>
            <div style={{ ...checkboxRow, gridColumn: "1 / -1" }}>
              <input
                id="add-bank-details"
                type="checkbox"
                checked={form.addBankDetails === "yes"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    addBankDetails: e.target.checked ? "yes" : "no",
                  }))
                }
                style={checkboxInput}
              />
              <label htmlFor="add-bank-details" style={checkboxLabel}>
                Add bank details
              </label>
            </div>
            {form.addBankDetails === "yes" && (
              <>
                <FormField label="Bank Name">
                  <input value={form.bankName} onChange={handle("bankName")} placeholder="Bank name" style={compactInputStyle} />
                </FormField>
                <FormField label="Account Holder">
                  <input value={form.accountHolderName} onChange={handle("accountHolderName")} placeholder="Account holder" style={compactInputStyle} />
                </FormField>
                <FormField label="Account Number">
                  <input value={form.accountNumber} onChange={handle("accountNumber")} placeholder="Account number" style={compactInputStyle} />
                </FormField>
                <FormField label="IFSC Code">
                  <input
                    value={form.ifscCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, ifscCode: e.target.value.toUpperCase() }))}
                    placeholder="IFSC"
                    style={compactInputStyle}
                  />
                </FormField>
                <FormField label="Branch">
                  <input value={form.branch} onChange={handle("branch")} placeholder="Branch" style={compactInputStyle} />
                </FormField>
                <FormField label="UPI ID">
                  <input value={form.upiId} onChange={handle("upiId")} placeholder="name@upi" style={compactInputStyle} />
                </FormField>
              </>
            )}
          </div>
        )}
        </div>

        <DepartmentFormModal
          open={showDepartmentModal}
          title="Add Department"
          onClose={() => {
            if (!departmentSaving) setShowDepartmentModal(false);
          }}
          departmentForm={departmentForm}
          setDepartmentForm={setDepartmentForm}
          saving={departmentSaving}
          onSubmit={saveDepartment}
          onCancelEdit={() => setDepartmentForm(emptyDepartmentForm)}
        />

        <div style={modalFooter}>
          <button onClick={step === "staff" ? () => setStep("contact") : onClose} style={secondaryBtn} disabled={saving}>
            {step === "staff" ? "Back" : "Cancel"}
          </button>
          <button onClick={submit} style={primaryBtn} disabled={saving}>
            {saving
              ? "Saving..."
              : hasHrAccess && step === "contact"
                ? "Next: Staff Details"
                : hasHrAccess
                  ? "Save Contact & Staff"
                  : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, hint = "", error = "", wide = false }) {
  return (
    <div style={{ marginBottom: 10, gridColumn: wide ? "1 / -1" : undefined }}>
      <label style={labelStyle}>
        {label}
        {hint && <span style={fieldHintStyle}>{hint}</span>}
      </label>
      {children}
      {error && <div style={fieldErrorStyle}>{error}</div>}
    </div>
  );
}

/* ---------- EditContactModal ---------- */
function EditContactModal({ contact, onClose, onUpdate, availableTags, isSuperAdmin }) {
  const [form, setForm] = useState({
    name: contact.name || "",
    mobile: contact.mobile || "",
    email: contact.email || "",
    password: "",
    tagId: contact.tags && contact.tags.length > 0 ? contact.tags[0]._id : "",
    role: contact.loginUser?.role || contact.role || "user",
    hrPermissions: normalizeHrPermissions(contact.loginUser?.hrPermissions),
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const handle = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const canConfigureHrPermissions = isSuperAdmin && ["manager", "hr"].includes(form.role);
  const toggleHrPermission = (key) => {
    setForm((prev) => ({
      ...prev,
      hrPermissions: {
        ...normalizeHrPermissions(prev.hrPermissions),
        [key]: !normalizeHrPermissions(prev.hrPermissions)[key],
      },
    }));
  };

  const submit = () => {
    const cleanMobile = form.mobile.replace(/\s/g, "").trim();
    if (!cleanMobile) return setError("Mobile number is required.");
    if (!/^\d{10,15}$/.test(cleanMobile))
      return setError("Enter a valid mobile number (10–15 digits).");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setError("Enter a valid email address.");
    if (form.password && form.password.length < 6)
      return setError("Password must be at least 6 characters.");
    setError("");
    onUpdate(contact._id, {
      name: form.name.trim() || "UNKNOWN",
      mobile: cleanMobile,
      email: form.email.trim() || null,
      password: form.password || undefined,
      tags: form.tagId ? [form.tagId] : [],
      ...(isSuperAdmin ? { role: form.role } : {}),
      ...(canConfigureHrPermissions ? { hrPermissions: normalizeHrPermissions(form.hrPermissions) } : {}),
    });
    onClose();
  };

  return (
    <div style={overlay}>
      <div style={modalShell(440)}>
        <div style={modalHeader}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#1a2233" }}>
            Edit Contact
          </h2>
          <button onClick={onClose} style={closeBtn} aria-label="Close">
            <X size={17} />
            ✕
          </button>
        </div>

        <div style={modalBody}>
        {error && (
          <p
            style={{
              color: "#e74c3c",
              fontSize: 13,
              marginBottom: 12,
              background: "#fdf0f0",
              padding: "8px 12px",
              borderRadius: 6,
            }}
          >
            {error}
          </p>
        )}

        {!isSuperAdmin && (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 14,
              fontSize: 13,
              color: "#92400e",
            }}
          >
            <Clock3 size={15} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
            Edits will be sent for <strong>admin approval</strong>.
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Name</label>
          <input
            value={form.name}
            onChange={handle("name")}
            placeholder="Full name (optional)"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Mobile Number *</label>
          <input
            value={form.mobile}
            onChange={handle("mobile")}
            placeholder="e.g. 919876543210"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            Email Address
            {isSuperAdmin && (
              <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 6, fontSize: 12 }}>
                (used for login)
              </span>
            )}
          </label>
          <input
            value={form.email}
            onChange={handle("email")}
            placeholder="e.g. john@example.com"
            type="email"
            style={inputStyle}
          />
        </div>

        {isSuperAdmin && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>
              New Password
              <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: 6, fontSize: 12 }}>
                (leave blank to keep existing)
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                value={form.password}
                onChange={handle("password")}
                placeholder="Min. 6 characters"
                type={showPassword ? "text" : "password"}
                style={{ ...inputStyle, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#9ca3af",
                  fontSize: 0,
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>
        )}

        {isSuperAdmin && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={handle("role")} style={inputStyle}>
              <option value="user">User</option>
              <option value="hr">HR</option>
              <option value="manager">Manager</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
        )}

        {canConfigureHrPermissions && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>HR Permissions</label>
            <div style={permissionGridStyle}>
              {HR_PERMISSION_OPTIONS.map((permission) => {
                const checked = normalizeHrPermissions(form.hrPermissions)[permission.key];
                return (
                  <label key={permission.key} style={{ ...checkboxRow, marginBottom: 0 }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleHrPermission(permission.key)}
                      style={checkboxInput}
                    />
                    <span style={checkboxLabel}>{permission.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Tag</label>
          <select value={form.tagId} onChange={handle("tagId")} style={inputStyle}>
            <option value="">Select a tag</option>
            {availableTags.map((tag) => (
              <option key={tag._id} value={tag._id}>
                {tag.name || tag.tagName}
              </option>
            ))}
          </select>
        </div>
        </div>

        <div style={modalFooter}>
          <button onClick={onClose} style={secondaryBtn}>
            Cancel
          </button>
          <button onClick={submit} style={primaryBtn}>
            Update Contact
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ManagerCard ---------- */
function ManagerCard({ manager, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
        cursor: "pointer",
        border: "1.5px solid #e5e7eb",
        transition: "border-color 0.2s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#0d9488")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e5e7eb")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background: "#0d9488",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          {(manager.name || "M")[0].toUpperCase()}
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "#1a2233", fontSize: 15 }}>
            {manager.name || "Unknown"}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{manager.phone}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Skeleton Loader ---------- */
function SkeletonContacts({ isSuperAdmin, isManager, adminView, isMobile }) {
  const shimmerCSS = `
    @keyframes shimmer {
      0% { background-position: -200px 0; }
      100% { background-position: calc(200px + 100%) 0; }
    }
    .shimmer {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
      background-size: 200px 100%;
      animation: shimmer 1.4s ease infinite;
    }
  `;

  if (isSuperAdmin && adminView === "managers") {
    return (
      <div className="contacts-page" style={pageWrapStyle(isMobile)}>
        <ContactsDarkStyles />
        <style>{shimmerCSS}</style>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 18,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <div className="shimmer" style={{ width: 42, height: 42, borderRadius: "50%" }} />
              <div style={{ flex: 1 }}>
                <div className="shimmer" style={{ width: "60%", height: 14, borderRadius: 4, marginBottom: 6 }} />
                <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isSuperAdmin && adminView === "pending") {
    return (
      <div className="contacts-page" style={pageWrapStyle(isMobile)}>
        <ContactsDarkStyles />
        <style>{shimmerCSS}</style>
        <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Name", "Mobile", "Email", "Created By", "Role", "Actions"].map((h) => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left" }}>
                    <div className="shimmer" style={{ width: "60%", height: 12, borderRadius: 4 }} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, r) => (
                <tr key={r}>
                  {[0, 1, 2, 3, 4, 5].map((c) => (
                    <td key={c} style={{ padding: "12px 16px" }}>
                      <div
                        className="shimmer"
                        style={{
                          width: c === 0 ? "70%" : c === 5 ? "40%" : "50%",
                          height: 12,
                          borderRadius: 4,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Main contacts table skeleton
  const showEmail = isSuperAdmin;
  const showCreatedBy = isSuperAdmin;
  const showLogin = isSuperAdmin;
  const showActions = isSuperAdmin || isManager;
  const showCheckbox = isSuperAdmin;

  return (
    <div className="contacts-page" style={pageWrapStyle(isMobile)}>
      <ContactsDarkStyles />
      <style>{shimmerCSS}</style>
      <div style={{ background: "#fff", borderRadius: 12, padding: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {showCheckbox && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: 20, height: 12, borderRadius: 4 }} />
                </th>
              )}
              <th style={{ padding: "12px 16px" }}>
                <div className="shimmer" style={{ width: "60%", height: 12, borderRadius: 4 }} />
              </th>
              <th style={{ padding: "12px 16px" }}>
                <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
              </th>
              {showEmail && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
                </th>
              )}
              <th style={{ padding: "12px 16px" }}>
                <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
              </th>
              <th style={{ padding: "12px 16px" }}>
                <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
              </th>
              {showLogin && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
                </th>
              )}
              {showCreatedBy && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
                </th>
              )}
              {showActions && (
                <th style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {[...Array(8)].map((_, r) => (
              <tr key={r}>
                {showCheckbox && (
                  <td style={{ padding: "12px 16px" }}>
                    <div className="shimmer" style={{ width: 16, height: 16, borderRadius: 4 }} />
                  </td>
                )}
                <td style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "80%", height: 12, borderRadius: 4 }} />
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "70%", height: 12, borderRadius: 4 }} />
                </td>
                {showEmail && (
                  <td style={{ padding: "12px 16px" }}>
                    <div className="shimmer" style={{ width: "60%", height: 12, borderRadius: 4 }} />
                  </td>
                )}
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <div className="shimmer" style={{ width: 50, height: 12, borderRadius: 4 }} />
                  </div>
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <div className="shimmer" style={{ width: "40%", height: 12, borderRadius: 4 }} />
                </td>
                {showLogin && (
                  <td style={{ padding: "12px 16px" }}>
                    <div className="shimmer" style={{ width: 76, height: 20, borderRadius: 999 }} />
                  </td>
                )}
                {showCreatedBy && (
                  <td style={{ padding: "12px 16px" }}>
                    <div className="shimmer" style={{ width: "50%", height: 12, borderRadius: 4 }} />
                  </td>
                )}
                {showActions && (
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <div className="shimmer" style={{ width: 16, height: 16, borderRadius: 4 }} />
                      {isSuperAdmin && (
                        <div className="shimmer" style={{ width: 16, height: 16, borderRadius: 4 }} />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Main ContactsPage ---------- */
export default function ContactsPage() {
  const router = useRouter();

  const [contacts, setContacts] = useState([]);
  const [pendingContacts, setPendingContacts] = useState([]);
  const [managers, setManagers] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [page, setPage] = useState(1);
  const [filterTagId, setFilterTagId] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const [adminView, setAdminView] = useState("all");
  const [selectedManager, setSelectedManager] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [allowedModules, setAllowedModules] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [defaultPayrollCycleDay, setDefaultPayrollCycleDay] = useState(1);
  const PER_PAGE = 25;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      storedUser = {};
    }
    const role = localStorage.getItem("role") || storedUser.role || "";
    setUserRole(role);
    setAllowedModules(Array.isArray(storedUser.allowedModules) ? storedUser.allowedModules : []);
    const check = () => setIsMobile(window.innerWidth <= 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isSuperAdmin = isTopAdminRole(userRole);
  const isManager = userRole === "manager";
  const isManagerOrAbove = isSuperAdmin || isManager;
  const canManageHr =
    userRole === "super_to_super_admin" ||
    (allowedModules.includes("hr") && ["super_admin", "manager", "hr"].includes(userRole));
  const hasHrAccess = canManageHr;

  const fetchContacts = async () => {
    try {
      let url = "/contacts";
      if (isSuperAdmin) {
        if (adminView === "all") url = "/contacts";
        else if (adminView === "manager" && selectedManager)
          url = `/contacts?managerId=${selectedManager._id}`;
        else if (adminView === "pending") url = "/contacts/pending";
        else return;
      }
      if (filterTagId) url += (url.includes("?") ? "&" : "?") + `tag=${filterTagId}`;
      const res = await API.get(url);
      if (adminView === "pending") {
        setPendingContacts((Array.isArray(res.data) ? res.data : []).filter(isVisibleContact));
      } else {
        const data = Array.isArray(res.data) ? res.data : res.data.contacts || [];
        setContacts(data.filter(isVisibleContact));
      }
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await API.get("/contacts/managers");
      setManagers(res.data);
    } catch (err) {
      console.error("Failed to fetch managers:", err);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await API.get("/tags");
      const data = res.data;
      setTags(
        Array.isArray(data.tags) ? data.tags : Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error("Failed to fetch tags:", err);
    }
  };

  const fetchHrMeta = async () => {
    if (!hasHrAccess) return;
    try {
      const [departmentRes, settingsRes] = await Promise.all([
        API.get("/hr/departments"),
        API.get("/hr/payroll/settings"),
      ]);
      const cycleDay = Number(settingsRes.data?.data?.cycleStartDay || 1);
      setDepartments(departmentRes.data?.data || []);
      setDefaultPayrollCycleDay(PAYROLL_CYCLE_OPTIONS.includes(cycleDay) ? cycleDay : 1);
    } catch (err) {
      console.error("Failed to fetch HR form data:", err);
    }
  };

  useEffect(() => {
    if (userRole) {
      fetchTags();
      fetchHrMeta();
      if (isSuperAdmin) fetchManagers();
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole) {
      setLoading(true);
      fetchContacts();
    }
  }, [filterTagId, adminView, selectedManager, userRole]);

  const addContact = async (contact) => {
    try {
      const res = await API.post("/contacts", contact);
      if (res.data.status === "pending") {
        alert("Contact submitted. Waiting for admin approval.");
      } else {
        alert("Contact added successfully.");
      }
      setContacts((prev) => [res.data, ...prev]);
      return res.data;
    } catch (err) {
      throw err;
    }
  };

  const addContactStaff = async (payload) => {
    try {
      const res = await API.post("/hr/contact-staff", payload);
      const contact = res.data?.data?.contact;
      if (contact) setContacts((prev) => [contact, ...prev]);
      alert("Contact and staff details added successfully.");
      return res.data?.data;
    } catch (err) {
      throw err;
    }
  };

  const updateContact = async (id, updatedData) => {
    try {
      const res = await API.put(`/contacts/${id}`, updatedData);
      setContacts((prev) => prev.map((c) => (c._id === id ? res.data : c)));
      if (res.data.status === "pending")
        alert("Edit submitted. Waiting for admin approval.");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update contact");
    }
  };

  const toggleLoginAccess = async (contact) => {
    if (!contact.loginUser?._id) return;

    const nextActive = contact.loginUser.isActive === false;
    try {
      const res = await API.patch(`/contacts/${contact._id}/login-status`, {
        isActive: nextActive,
      });
      setContacts((prev) => prev.map((c) => (c._id === contact._id ? res.data : c)));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update login access");
    }
  };

  const approveContact = async (id) => {
    try {
      await API.put(`/contacts/${id}/approve`);
      setPendingContacts((prev) => prev.filter((c) => c._id !== id));
      alert("Contact approved.");
    } catch (err) {
      alert("Failed to approve");
    }
  };

  const rejectContact = async (id) => {
    try {
      await API.put(`/contacts/${id}/reject`);
      setPendingContacts((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      alert("Failed to reject");
    }
  };

  const deleteSingleContact = async (contactId, contactName) => {
    if (!confirm(`Delete "${contactName}" permanently?`)) return;
    try {
      await API.delete(`/contacts/${contactId}`);
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
      const next = new Set(selected);
      next.delete(contactId);
      setSelected(next);
    } catch (err) {
      alert("Failed to delete contact");
    }
  };

  const deleteSelected = async () => {
    const ids = Array.from(selected);
    if (!ids.length || !confirm(`Delete ${ids.length} contact(s)?`)) return;
    try {
      await Promise.all(ids.map((id) => API.delete(`/contacts/${id}`)));
      setContacts((prev) => prev.filter((c) => !selected.has(c._id)));
      setSelected(new Set());
    } catch (err) {
      alert("Error deleting selected contacts");
    }
  };

  const getTagName = (tag) => {
    if (typeof tag === "string") return tag;
    return tag?.name || tag?.tagName || "";
  };

  const filtered = contacts.filter((c) => {
    if (!isVisibleContact(c)) return false;
    const tagNames = (c.tags || []).map(getTagName).join(" ");
    const matchesSearch =
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile?.includes(search) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      tagNames.toLowerCase().includes(search.toLowerCase());
    const matchesRole = !roleFilter || getContactRole(c) === roleFilter;
    return matchesSearch && matchesRole;
  });

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const toggleAll = () => {
    if (selected.size === paged.length && paged.length > 0) setSelected(new Set());
    else setSelected(new Set(paged.map((c) => c._id)));
  };
  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const toolbarWrapStyle = (mobile) => ({
    display: "flex",
    flexDirection: mobile ? "column" : "row",
    alignItems: mobile ? "stretch" : "center",
    gap: 12,
    marginBottom: 20,
    flexWrap: mobile ? "nowrap" : "wrap",
    flexShrink: 0,
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.05)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.06)",
    borderRadius: 22,
    padding: 16,
  });

  // ===== SKELETON LOADING =====
  if (loading) {
    return (
      <SkeletonContacts
        isSuperAdmin={isSuperAdmin}
        isManager={isManager}
        adminView={adminView}
        isMobile={isMobile}
      />
    );
  }

  // ════════════════════════════════════════
  // SUPER ADMIN — MANAGERS LIST VIEW
  // ════════════════════════════════════════
  if (isSuperAdmin && adminView === "managers") {
    return (
      <div className="contacts-page" style={pageWrapStyle(isMobile)}>
        <ContactsDarkStyles />
        <div style={contentShell}>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                setAdminView("all");
                setLoading(true);
              }}
              style={tabBtn}
            >  
              <Globe2 size={15} />
              All Contacts
            </button>
            <button style={{ ...tabBtn, ...activeTabBtn }}>
              <Users size={15} />
              Managers
            </button>
            <button
              onClick={() => {
                setAdminView("pending");
                setLoading(true);
              }}
              style={tabBtn}
            >
              <Clock3 size={15} />
              Pending Approvals
              {pendingContacts.length > 0 && (
                <span
                  style={{
                    background: "#e74c3c",
                    color: "#fff",
                    borderRadius: "50%",
                    padding: "1px 6px",
                    fontSize: 11,
                    marginLeft: 6,
                  }}
                >
                  {pendingContacts.length}
                </span>
              )}
            </button>
          </div>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1a2233" }}>
            All Managers
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
              overflowY: "auto",
            }}
          >
            {managers.length === 0 && (
              <p style={{ color: "#9ca3af", fontSize: 14 }}>No managers found.</p>
            )}
            {managers.map((mgr) => (
              <ManagerCard
                key={mgr._id}
                manager={mgr}
                onClick={() => {
                  setSelectedManager(mgr);
                  setAdminView("manager");
                  setLoading(true);
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // SUPER ADMIN — PENDING APPROVALS VIEW
  // ════════════════════════════════════════
  if (isSuperAdmin && adminView === "pending") {
    return (
      <div className="contacts-page" style={pageWrapStyle(isMobile)}>
        <ContactsDarkStyles />
        <div style={contentShell}>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexShrink: 0,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                setAdminView("all");
                setLoading(true);
              }}
              style={tabBtn}
            >
              <Globe2 size={15} />
              All Contacts
            </button>
            <button onClick={() => setAdminView("managers")} style={tabBtn}>
              <Users size={15} />
              Managers
            </button>
            <button style={{ ...tabBtn, ...activeTabBtn }}>
              <Clock3 size={15} />
              Pending Approvals
            </button>
          </div>
          <h2 style={{ margin: "0 0 16px", fontSize: 18, fontWeight: 700, color: "#1a2233" }}>
            Pending Approvals{" "}
            <span style={{ fontSize: 14, color: "#6b7280", fontWeight: 400 }}>
              ({pendingContacts.length})
            </span>
          </h2>
          <div style={tableCard}>
            <div style={tableScroll}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 780 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <th style={stickyTh}>Name</th>
                    <th style={stickyTh}>Mobile</th>
                    <th style={stickyTh}>Email</th>
                    <th style={stickyTh}>Created By</th>
                    <th style={stickyTh}>Role</th>
                    <th style={stickyTh}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingContacts.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          textAlign: "center",
                          padding: "48px 0",
                          color: "#9ca3af",
                        }}
                      >
                        No pending approvals 🎉
                      </td>
                    </tr>
                  )}
                  {pendingContacts.map((c) => (
                    <tr
                      key={c._id}
                      className="contacts-table-row"
                      style={{ borderBottom: "1px solid #f3f4f6", background: "#fff" }}
                    >
                      <td style={{ ...td, color: "#0f172a", fontWeight: 750 }}>{c.name}</td>
                      <td style={{ ...td, color: "#475569", fontWeight: 600 }}>{c.mobile}</td>
                      <td style={td}>
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            style={{ color: "#0d9488", textDecoration: "none", fontSize: 13 }}
                          >
                            {c.email}
                          </a>
                        ) : (
                          <span style={{ color: "#dc2626", fontSize: 12, fontWeight: 700 }}>
                            No email
                          </span>
                        )}
                      </td>
                      <td style={td}>
                        <div style={{ fontSize: 13 }}>{c.createdBy?.name || "—"}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>
                          {c.createdBy?.role}
                        </div>
                      </td>
                      <td style={td}>
                        <StatusBadge status="pending" />
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => approveContact(c._id)}
                            style={{
                              background: "#d1fae5",
                              color: "#065f46",
                              border: "none",
                              borderRadius: 8,
                              padding: "7px 12px",
                              cursor: "pointer",
                              fontWeight: 700,
                              fontSize: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <CheckCircle size={14} />
                            <span style={{ fontSize: 13 }}>Approve</span>
                          </button>
                          <button
                            onClick={() => rejectContact(c._id)}
                            style={{
                              background: "#fee2e2",
                              color: "#991b1b",
                              border: "none",
                              borderRadius: 8,
                              padding: "7px 12px",
                              cursor: "pointer",
                              fontWeight: 700,
                              fontSize: 0,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            <XCircle size={14} />
                            <span style={{ fontSize: 13 }}>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════
  // CONTACTS TABLE VIEW (all roles)
  // ════════════════════════════════════════
  return (
    <div className="contacts-page" style={pageWrapStyle(isMobile)}>
      <ContactsDarkStyles />
      <div style={contentShell}>
        {/* Admin Tabs */}
        {isSuperAdmin && (
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexShrink: 0,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button style={{ ...tabBtn, ...activeTabBtn }}>
              {adminView === "manager" ? (
                <>
                  <Users size={15} />
                  {selectedManager?.name}
                  {"'s Contacts"}
                </>
              ) : (
                <>
                  <Globe2 size={15} />
                  All Contacts
                </>
              )}
            </button>
            <button onClick={() => setAdminView("managers")} style={tabBtn}>
              <Users size={15} />
              Managers
            </button>
            <button
              onClick={() => {
                setAdminView("pending");
                setLoading(true);
              }}
              style={tabBtn}
            >
              <Clock3 size={15} />
              Pending
            </button>
            {adminView === "manager" && (
              <button
                onClick={() => {
                  setAdminView("managers");
                  setSelectedManager(null);
                }}
                style={{
                  ...secondaryBtn,
                  marginLeft: isMobile ? 0 : "auto",
                }}
              >
                <ArrowLeft size={15} />
                Back to Managers
              </button>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div style={toolbarWrapStyle(isMobile)}>
          <div
            style={{
              position: "relative",
              flex: isMobile ? "1 1 100%" : "1 1 340px",
              minWidth: isMobile ? "100%" : 260,
              maxWidth: isMobile ? "100%" : 520,
            }}
          >
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, mobile, email or tag"
              style={{
                ...inputStyle,
                width: "100%",
                paddingLeft: 42,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
                fontSize: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <Search size={17} />
            </span>
          </div>

          <select
            value={filterTagId}
            onChange={(e) => {
              setFilterTagId(e.target.value);
              setPage(1);
            }}
            style={filterSelectStyle(isMobile, 188)}
          >
            <option value="">All tags</option>
            {tags.map((tag) => (
              <option key={tag._id} value={tag._id}>
                {getTagName(tag)}
              </option>
            ))}
          </select>

          {isSuperAdmin && (
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              style={filterSelectStyle(isMobile, 178)}
            >
              {ROLE_FILTERS.map((role) => (
                <option key={role.value || "all"} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          )}

          <div style={{ flex: isMobile ? "0" : 1 }} />

          {isSuperAdmin && selected.size > 0 && (
            <button
              onClick={deleteSelected}
              style={{ ...secondaryBtn, color: "#dc2626", borderColor: "#fecaca" }}
            >
              <Trash2 size={15} />
              Delete ({selected.size})
            </button>
          )}

          <button
            onClick={() => router.push("/Tags")}
            style={{
              ...primaryBtn,
              background: "#fff",
              color: "#0d9488",
              border: "1.5px solid #0d9488",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <Tag size={15} />
            Add Tag
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            style={{ ...primaryBtn, width: isMobile ? "100%" : "auto" }}
          >
            <Plus size={15} />
            Add Contact
          </button>
        </div>

        {/* Table */}
        <div style={tableCard}>
          <div style={tableScroll}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
                minWidth: isSuperAdmin ? 1040 : 760,
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  {isSuperAdmin && (
                    <th style={stickyTh}>
                      <input
                        type="checkbox"
                        checked={
                          selected.size === paged.length && paged.length > 0
                        }
                        onChange={toggleAll}
                      />
                    </th>
                  )}
                  <th style={{ ...stickyTh, textAlign: "left" }}>Name</th>
                  <th style={{ ...stickyTh, textAlign: "left" }}>Mobile</th>
                  {isSuperAdmin && <th style={{ ...stickyTh, textAlign: "left" }}>Email</th>}
                  <th style={{ ...stickyTh, textAlign: "left" }}>Tags</th>
                  <th style={{ ...stickyTh, textAlign: "left" }}>Status</th>
                  {isSuperAdmin && <th style={{ ...stickyTh, textAlign: "left" }}>Login</th>}
                  {isSuperAdmin && <th style={{ ...stickyTh, textAlign: "left" }}>Created By</th>}
                  {isManagerOrAbove && <th style={{ ...stickyTh, textAlign: "left" }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        4 +
                        (isSuperAdmin ? 4 : 0) +
                        (isManagerOrAbove ? 1 : 0)
                      }
                      style={{
                        textAlign: "center",
                        padding: "48px 0",
                        color: "#9ca3af",
                        fontSize: 14,
                      }}
                    >
                      No contacts found. Click &quot;+ Add Contact&quot; to get started.
                    </td>
                  </tr>
                )}
                {paged.map((c) => (
                  <tr
                    key={c._id}
                    className="contacts-table-row"
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: selected.has(c._id) ? "#f0fdf4" : "#fff",
                    }}
                  >
                    {isSuperAdmin && (
                      <td style={td}>
                        <input
                          type="checkbox"
                          checked={selected.has(c._id)}
                          onChange={() => toggleOne(c._id)}
                        />
                      </td>
                    )}
                    <td style={{ ...td, color: "#0f172a", fontWeight: 750 }}>
                      {c.name || "Unknown"}
                    </td>
                    <td style={{ ...td, color: "#475569", fontWeight: 600 }}>{c.mobile}</td>
                    {isSuperAdmin && (
                      <td style={td}>
                        {c.email ? (
                          <a
                            href={`mailto:${c.email}`}
                            style={{
                              color: "#0d9488",
                              textDecoration: "none",
                              fontSize: 13,
                            }}
                          >
                            {c.email}
                          </a>
                        ) : (
                          <span
                            style={{ color: "#dc2626", fontSize: 12, fontWeight: 700 }}
                          >
                            No email
                          </span>
                        )}
                      </td>
                    )}
                    <td style={td}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {c.tags && c.tags.length > 0 ? (
                          c.tags.map((tag, idx) => (
                            <TagBadge key={idx} label={getTagName(tag)} />
                          ))
                        ) : (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </div>
                    </td>
                    <td style={td}>
                      <StatusBadge status={c.status || "approved"} />
                    </td>
                    {isSuperAdmin && (
                      <td style={td}>
                        <LoginAccessToggle contact={c} onToggle={toggleLoginAccess} />
                      </td>
                    )}
                    {isSuperAdmin && (
                      <td style={{ ...td, fontSize: 12, color: "#6b7280" }}>
                        {c.createdBy?.name || "—"}
                        <br />
                        <span style={{ color: "#9ca3af" }}>{c.createdBy?.role}</span>
                      </td>
                    )}
                    {isManagerOrAbove && (
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <ActionIconButton
                            onClick={() => setEditingContact(c)}
                            label="Edit"
                            tone="edit"
                          >
                            <Edit size={13} />
                          </ActionIconButton>
                          {isSuperAdmin && (
                            <ActionIconButton
                              onClick={() => deleteSingleContact(c._id, c.name)}
                              label="Delete"
                              tone="delete"
                            >
                              <Trash2 size={13} />
                            </ActionIconButton>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={tableFooter}>
            <span>
              Showing {paged.length} of {total} contacts
            </span>
            {(search || filterTagId || roleFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilterTagId("");
                  setRoleFilter("");
                  setPage(1);
                }}
                style={clearFilterBtn}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Pagination */}
        <div style={paginationRow}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={pageBtn(currentPage === 1)}
          >
            <ChevronLeft size={16} />
            ‹
          </button>
          <span style={{ fontSize: 13, color: "#374151" }}>
            {total === 0
              ? "0–0 of 0"
              : `${(currentPage - 1) * PER_PAGE + 1}–${Math.min(
                  currentPage * PER_PAGE,
                  total
                )} of ${total}`}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={pageBtn(currentPage === totalPages)}
          >
            <ChevronRight size={16} />
            ›
          </button>
        </div>
      </div>

      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onAdd={addContact}
          onAddStaff={addContactStaff}
          onDepartmentsChange={setDepartments}
          availableTags={tags}
          departments={departments}
          defaultPayrollCycleDay={defaultPayrollCycleDay}
          isSuperAdmin={isSuperAdmin}
          hasHrAccess={hasHrAccess}
          userRole={userRole}
        />
      )}
      {editingContact && (
        <EditContactModal
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onUpdate={updateContact}
          availableTags={tags}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  );
}

// ── Shared Styles ────────────────────────────────────────────────────────
const inputStyle = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  border: "1px solid #dbe3eb",
  borderRadius: 14,
  fontSize: 13,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box",
  color: "#0f172a",
  background: "#fff",
  boxShadow: "0 2px 8px rgba(15,23,42,0.04)",
};

const compactInputStyle = {
  ...inputStyle,
  height: 36,
  padding: "0 10px",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 1px 4px rgba(15,23,42,0.035)",
};

const textareaStyle = {
  ...inputStyle,
  height: "auto",
  minHeight: 76,
  paddingTop: 10,
  resize: "vertical",
};

const compactTextareaStyle = {
  ...compactInputStyle,
  height: "auto",
  minHeight: 58,
  paddingTop: 8,
  resize: "vertical",
};

const formGrid = (columns = 2) => ({
  display: "grid",
  gridTemplateColumns: columns === 1 ? "1fr" : `repeat(${columns}, minmax(0, 1fr))`,
  gap: "0 12px",
});

const fieldHintStyle = {
  marginLeft: 6,
  color: "#64748b",
  fontSize: 11,
  fontWeight: 500,
};

const fieldErrorStyle = {
  color: "#dc2626",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1.25,
  marginTop: 4,
};

const inlineAddDepartmentBtn = {
  border: "1px solid #99f6e4",
  background: "#ecfdf5",
  color: "#0f766e",
  borderRadius: 999,
  minHeight: 24,
  padding: "0 9px",
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  whiteSpace: "nowrap",
};

const stepPill = (active) => ({
  border: `1px solid ${active ? "#0d9488" : "#dbe3eb"}`,
  background: active ? "#ecfdf5" : "#f8fafc",
  color: active ? "#0f766e" : "#64748b",
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 11,
  fontWeight: 800,
});

const checkboxRow = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  minHeight: 34,
  marginBottom: 10,
};

const checkboxInput = {
  width: 16,
  height: 16,
  accentColor: "#0d9488",
  cursor: "pointer",
};

const checkboxLabel = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
};

const permissionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 8,
  padding: 12,
  border: "1px solid #dbe3eb",
  borderRadius: 12,
  background: "#f8fafc",
};

const modalShell = (width = 440) => ({
  ...modalBox,
  width,
  maxHeight: "90vh",
  padding: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
});

const modalHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  padding: "22px 32px 14px",
  borderBottom: "1px solid #eef2f7",
  background: "#fff",
  flexShrink: 0,
};

const modalBody = {
  padding: "16px 32px 12px",
  overflowY: "auto",
  minHeight: 0,
  flex: 1,
};

const modalFooter = {
  display: "flex",
  gap: 10,
  justifyContent: "flex-end",
  background: "#fff",
  padding: "14px 32px 20px",
  borderTop: "1px solid #eef2f7",
  flexShrink: 0,
};

const salaryPreviewCard = {
  gridColumn: "1 / -1",
  display: "grid",
  gridTemplateColumns: "1.25fr repeat(3, minmax(0, 1fr))",
  gap: 10,
  alignItems: "stretch",
  border: "1px solid #dbe3eb",
  borderRadius: 10,
  background: "#f8fafc",
  padding: 10,
  margin: "0 0 10px",
};

const previewHeader = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  minWidth: 0,
};

const previewTile = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  background: "#fff",
  padding: "8px 10px",
  minWidth: 0,
};

const previewEyebrow = {
  display: "block",
  fontSize: 10,
  fontWeight: 800,
  color: "#64748b",
  textTransform: "uppercase",
  marginBottom: 3,
};

const previewValue = {
  display: "block",
  fontSize: 15,
  lineHeight: 1.15,
  color: "#0f172a",
  fontWeight: 900,
  marginBottom: 3,
};

const previewMuted = {
  display: "block",
  fontSize: 11,
  lineHeight: 1.25,
  color: "#64748b",
  fontWeight: 700,
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#374151",
  marginBottom: 4,
};

const fieldLabelActionRow = {
  ...labelStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};

const primaryBtn = {
  background: "linear-gradient(135deg, #0f5f64 0%, #14808a 65%, #22c55e 100%)",
  color: "#fff",
  border: "none",
  borderRadius: 999,
  minHeight: 42,
  padding: "0 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 10px 20px rgba(15,95,100,0.16)",
};

const secondaryBtn = {
  background: "#fff",
  color: "#334155",
  border: "1px solid #dbe3eb",
  borderRadius: 999,
  minHeight: 42,
  padding: "0 16px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
};

const tabBtn = {
  background: "#fff",
  border: "1px solid #dbe3eb",
  borderRadius: 999,
  minHeight: 40,
  padding: "0 15px",
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  color: "#334155",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  whiteSpace: "nowrap",
};

const activeTabBtn = {
  background: "linear-gradient(135deg, #0f5f64 0%, #14808a 65%, #22c55e 100%)",
  border: "none",
  color: "#fff",
  boxShadow: "0 10px 20px rgba(15,95,100,0.16)",
};

const stickyTh = {
  padding: "12px 20px",
  fontWeight: 800,
  fontSize: 11,
  color: "#64748b",
  whiteSpace: "nowrap",
  background: "#f8fafc",
  position: "sticky",
  top: 0,
  zIndex: 2,
  textAlign: "left",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const td = { padding: "14px 20px", color: "#334155", fontSize: 13 };

const paginationRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  marginTop: 16,
  flexShrink: 0,
};

const pageBtn = (disabled) => ({
  background: "#fff",
  border: "1px solid #dbe3eb",
  borderRadius: 8,
  width: 34,
  height: 34,
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1,
  fontSize: 0,
  color: "#334155",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
});

const contentShell = {
  width: "100%",
  height: "100%",
  minHeight: 0,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const tableCard = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

const tableScroll = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overflowX: "auto",
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  WebkitOverflowScrolling: "touch",
};

const tableFooter = {
  padding: "11px 20px",
  borderTop: "1px solid #f1f5f9",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
};

const clearFilterBtn = {
  background: "none",
  border: "none",
  color: "#0f5f64",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  padding: 0,
};

const filterSelectStyle = (mobile, width = 180) => ({
  ...inputStyle,
  width: mobile ? "100%" : width,
  maxWidth: "100%",
  flex: mobile ? "1 1 100%" : `0 1 ${width}px`,
  minWidth: mobile ? "100%" : 150,
  paddingRight: 36,
});

const actionIconBtn = (tone) => ({
  width: 32,
  height: 32,
  borderRadius: 8,
  border: tone === "delete" ? "1px solid #fee2e2" : "1px solid #e5e7eb",
  background: "#fff",
  color: tone === "delete" ? "#dc2626" : tone === "edit" ? "#3b82f6" : "#475569",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.5)",
  backdropFilter: "blur(6px)",
  WebkitBackdropFilter: "blur(6px)",
  animation: "appModalBackdropIn 0.32s ease-out both",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: 16,
};

const modalBox = {
  background: "#fff",
  borderRadius: 14,
  padding: "28px 32px",
  width: 440,
  maxWidth: "95vw",
  boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
  animation: "appModalCardIn 0.32s cubic-bezier(0.22, 1, 0.36, 1) both",
};

const closeBtn = {
  background: "none",
  border: "none",
  fontSize: 0,
  cursor: "pointer",
  color: "#6b7280",
  padding: "4px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};
