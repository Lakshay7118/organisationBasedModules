"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Building2, CreditCard, MapPin, Save, UserRound } from "lucide-react";
import { Country, State, City } from "country-state-city";
import API from "../../utils/api";

const PAYROLL_CYCLE_OPTIONS = [1, 7, 15];
const COUNTRY_OPTIONS = Country.getAllCountries();

function localDate(date = new Date()) {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
}

function idOf(item) {
  return (item?._id || item?.id || "").toString();
}

function normalizeSalaryBasisValue(basis) {
  return ["monthly", "daily", "hourly"].includes(basis) ? basis : "monthly";
}

function normalizePayrollCycleDay(day, fallback = 1) {
  const parsed = Number(day);
  return PAYROLL_CYCLE_OPTIONS.includes(parsed) ? parsed : fallback;
}

function shiftLabel(shift) {
  if (!shift?.start && !shift?.end) return "No shift set";
  return `${shift?.start || "--"} - ${shift?.end || "--"}`;
}

function dayLabels(days = []) {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days.length ? days.map((day) => labels[Number(day)]).filter(Boolean).join(", ") : "No weekly off";
}

function emptyStaff(cycleStartDay = 1) {
  return {
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
    payrollCycleDay: cycleStartDay,
    joinDate: localDate(),
    status: "active",
  };
}

function formFromStaff(staff, cycleStartDay) {
  return {
    ...emptyStaff(cycleStartDay),
    employeeCode: staff.employeeCode || "",
    name: staff.name || "",
    email: staff.email || "",
    phone: staff.phone || "",
    addressCountry: staff.address?.countryCode || "IN",
    addressState: staff.address?.stateCode || "",
    addressCity: staff.address?.cityName || "",
    houseAddress: staff.address?.houseAddress || "",
    bankName: staff.bankName || "",
    accountHolderName: staff.accountHolderName || "",
    accountNumber: staff.accountNumber || "",
    ifscCode: staff.ifscCode || "",
    branch: staff.branch || "",
    upiId: staff.upiId || "",
    department: idOf(staff.department),
    designation: staff.designation || "",
    monthlySalary: staff.monthlySalary || "",
    salaryBasis: normalizeSalaryBasisValue(staff.salaryBasis),
    expectedHoursPerDay: staff.expectedHoursPerDay || 8,
    payrollCycleDay: normalizePayrollCycleDay(staff.payrollCycleDay, cycleStartDay),
    joinDate: staff.joinDate ? staff.joinDate.slice(0, 10) : localDate(),
    status: staff.status || "active",
  };
}

function StaffFormRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = searchParams.get("id") || "";
  const isEditing = Boolean(staffId);

  const [departments, setDepartments] = useState([]);
  const [cycleStartDay, setCycleStartDay] = useState(1);
  const [form, setForm] = useState(() => emptyStaff(1));
  const [bankOpen, setBankOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const addressStates = useMemo(
    () => State.getStatesOfCountry(form.addressCountry || ""),
    [form.addressCountry]
  );
  const addressCities = useMemo(
    () => (form.addressCountry && form.addressState
      ? City.getCitiesOfState(form.addressCountry, form.addressState)
      : []),
    [form.addressCountry, form.addressState]
  );
  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find((country) => country.isoCode === form.addressCountry) || null,
    [form.addressCountry]
  );
  const selectedState = useMemo(
    () => addressStates.find((state) => state.isoCode === form.addressState) || null,
    [addressStates, form.addressState]
  );
  const selectedCity = useMemo(
    () => addressCities.find((city) => city.name === form.addressCity) || null,
    [addressCities, form.addressCity]
  );
  const selectedDepartment = useMemo(
    () => departments.find((department) => idOf(department) === form.department) || null,
    [departments, form.department]
  );

  const salaryBasis = normalizeSalaryBasisValue(form.salaryBasis);
  const salaryLabel = salaryBasis === "hourly" ? "Hourly Rate" : salaryBasis === "daily" ? "Daily Salary" : "Monthly Salary";
  const salaryPreview = useMemo(() => {
    const salary = Number(form.monthlySalary || 0);
    const hours = Math.max(0, Number(form.expectedHoursPerDay || 0)) || 8;
    if (salaryBasis === "daily") return `Daily: Rs. ${salary.toLocaleString("en-IN")} | Hour estimate: Rs. ${(salary / hours || 0).toFixed(2)}`;
    if (salaryBasis === "hourly") return `Hourly: Rs. ${salary.toLocaleString("en-IN")}`;
    return `Monthly: Rs. ${salary.toLocaleString("en-IN")} | Daily estimate: Rs. ${(salary / 26 || 0).toFixed(2)}`;
  }, [form.expectedHoursPerDay, form.monthlySalary, salaryBasis]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const [deptRes, settingsRes] = await Promise.all([
          API.get("/hr/departments"),
          API.get("/hr/payroll/settings"),
        ]);
        if (!active) return;
        const nextCycleDay = normalizePayrollCycleDay(settingsRes.data?.data?.cycleStartDay || 1);
        setDepartments(deptRes.data?.data || []);
        setCycleStartDay(nextCycleDay);
        if (staffId) {
          const staffRes = await API.get(`/hr/staff/${staffId}`);
          if (!active) return;
          const staff = staffRes.data?.data;
          setForm(formFromStaff(staff || {}, nextCycleDay));
          setBankOpen(["bankName", "accountHolderName", "accountNumber", "ifscCode", "branch", "upiId"].some((field) => String(staff?.[field] || "").trim()));
        } else {
          setForm(emptyStaff(nextCycleDay));
        }
      } catch (error) {
        setNotice({ type: "error", text: error.response?.data?.error || "Could not load staff form." });
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [staffId]);

  const updateForm = (updates) => setForm((current) => ({ ...current, ...updates }));

  const saveStaff = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setNotice({ type: "error", text: "Staff name is required." });
    if (!form.department) return setNotice({ type: "error", text: "Select a department." });

    const payload = {
      ...form,
      department: form.department || null,
      monthlySalary: Number(form.monthlySalary || 0),
      salaryBasis,
      expectedHoursPerDay: Number(form.expectedHoursPerDay || 8),
      payrollCycleDay: normalizePayrollCycleDay(form.payrollCycleDay, cycleStartDay),
      address: {
        countryCode: form.addressCountry || "",
        countryName: selectedCountry?.name || "",
        stateCode: form.addressState || "",
        stateName: selectedState?.name || "",
        cityName: selectedCity?.name || form.addressCity || "",
        houseAddress: form.houseAddress || "",
      },
    };

    setSaving(true);
    setNotice(null);
    try {
      const res = isEditing
        ? await API.patch(`/hr/staff/${staffId}`, payload)
        : await API.post("/hr/staff", payload);
      const savedId = idOf(res.data?.data);
      router.push(savedId ? `/HR?staff=${savedId}` : "/HR");
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.error || "Could not save staff." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <StaffFormSkeleton />;
  }

  return (
    <main className="staff-form-page">
      <div className="staff-form-topbar">
        <button type="button" className="staff-back-btn" onClick={() => router.push("/HR")}>
          <ArrowLeft size={17} /> Back
        </button>
        <div>
          <h1>{isEditing ? "Edit Staff" : "Add Staff"}</h1>
          <p>{isEditing ? "Update profile, address, payroll, and bank details." : "Create a complete staff profile for attendance and payroll."}</p>
        </div>
        <button type="submit" form="staff-form" className="staff-save-btn" disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : isEditing ? "Update Staff" : "Save Staff"}
        </button>
      </div>

      {notice && <div className={`staff-notice ${notice.type}`}>{notice.text}</div>}

      <form id="staff-form" className="staff-form-layout" onSubmit={saveStaff}>
        <section className="staff-form-section">
          <div className="staff-section-title"><UserRound size={18} /><h2>Profile</h2></div>
          <div className="staff-grid">
            <Field label="Employee Code"><input value={form.employeeCode} onChange={(e) => updateForm({ employeeCode: e.target.value })} placeholder="EMP-001" /></Field>
            <Field label="Name"><input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="Full name" /></Field>
            <Field label="Phone"><input value={form.phone} onChange={(e) => updateForm({ phone: e.target.value })} placeholder="Mobile" /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={(e) => updateForm({ email: e.target.value })} placeholder="email@example.com" /></Field>
            <Field label="Department">
              <select value={form.department} onChange={(e) => updateForm({ department: e.target.value })}>
                <option value="">Select department</option>
                {departments.map((department) => <option key={idOf(department)} value={idOf(department)}>{department.name} ({shiftLabel(department.shift)})</option>)}
              </select>
            </Field>
            <Field label="Designation"><input value={form.designation} onChange={(e) => updateForm({ designation: e.target.value })} placeholder="Support Executive" /></Field>
          </div>
          {selectedDepartment && (
            <div className="staff-inline-summary">
              <strong>{shiftLabel(selectedDepartment.shift)}</strong>
              <span>Weekly off: {dayLabels(selectedDepartment.weeklyOffDays)} | Short leave: {selectedDepartment.leavePolicy?.shortLeaves ?? 0}/cycle</span>
            </div>
          )}
        </section>

        <section className="staff-form-section">
          <div className="staff-section-title"><MapPin size={18} /><h2>Address</h2></div>
          <div className="staff-grid">
            <Field label="Country">
              <select value={form.addressCountry} onChange={(e) => updateForm({ addressCountry: e.target.value, addressState: "", addressCity: "" })}>
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map((country) => <option key={country.isoCode} value={country.isoCode}>{country.name}</option>)}
              </select>
            </Field>
            <Field label="State">
              <select value={form.addressState} onChange={(e) => updateForm({ addressState: e.target.value, addressCity: "" })} disabled={!form.addressCountry}>
                <option value="">Select state</option>
                {addressStates.map((state) => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}
              </select>
            </Field>
            <Field label="City">
              <select value={form.addressCity} onChange={(e) => updateForm({ addressCity: e.target.value })} disabled={!form.addressState}>
                <option value="">Select city</option>
                {addressCities.map((city) => <option key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>{city.name}</option>)}
              </select>
            </Field>
            <Field label="House / Street Address" className="span-all">
              <textarea value={form.houseAddress} onChange={(e) => updateForm({ houseAddress: e.target.value })} rows={4} placeholder="House number, street, landmark" />
            </Field>
          </div>
        </section>

        <section className="staff-form-section">
          <div className="staff-section-title"><Building2 size={18} /><h2>Payroll</h2></div>
          <div className="staff-grid">
            <Field label="Salary Basis">
              <select value={form.salaryBasis} onChange={(e) => updateForm({ salaryBasis: e.target.value, expectedHoursPerDay: form.expectedHoursPerDay || 8 })}>
                <option value="monthly">Monthly</option>
                <option value="daily">Daily</option>
                <option value="hourly">Hourly</option>
              </select>
            </Field>
            {salaryBasis === "monthly" ? (
              <Field label="Payroll Cycle">
                <select value={form.payrollCycleDay} onChange={(e) => updateForm({ payrollCycleDay: e.target.value })}>
                  {PAYROLL_CYCLE_OPTIONS.map((day) => <option key={day} value={day}>{day} to {day}</option>)}
                </select>
              </Field>
            ) : (
              <div className="staff-readonly-box">
                <span>Payroll cycle</span>
                <strong>End of day</strong>
              </div>
            )}
            <Field label={salaryLabel}><input type="number" min="0" value={form.monthlySalary} onChange={(e) => updateForm({ monthlySalary: e.target.value })} placeholder="30000" /></Field>
            <Field label="Daily Work Hours"><input type="number" min="0" step="0.5" value={form.expectedHoursPerDay} onChange={(e) => updateForm({ expectedHoursPerDay: e.target.value })} /></Field>
            <Field label="Joining Date"><input type="date" value={form.joinDate?.slice(0, 10)} onChange={(e) => updateForm({ joinDate: e.target.value })} /></Field>
            <Field label="Status">
              <select value={form.status} onChange={(e) => updateForm({ status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="resigned">Resigned</option>
              </select>
            </Field>
          </div>
          <div className="staff-inline-summary"><strong>{salaryPreview}</strong></div>
        </section>

        <section className="staff-form-section">
          <div className="staff-section-head">
            <div className="staff-section-title"><CreditCard size={18} /><h2>Bank Details</h2></div>
            <button type="button" className="staff-toggle-btn" onClick={() => setBankOpen((open) => !open)}>{bankOpen ? "Hide" : "Add"} Bank Detail</button>
          </div>
          {bankOpen && (
            <div className="staff-grid">
              <Field label="Bank Name"><input value={form.bankName} onChange={(e) => updateForm({ bankName: e.target.value })} placeholder="e.g. State Bank of India" /></Field>
              <Field label="Account Holder Name"><input value={form.accountHolderName} onChange={(e) => updateForm({ accountHolderName: e.target.value })} placeholder="Account holder name" /></Field>
              <Field label="Account Number"><input value={form.accountNumber} onChange={(e) => updateForm({ accountNumber: e.target.value })} placeholder="Account No" /></Field>
              <Field label="IFSC Code"><input value={form.ifscCode} onChange={(e) => updateForm({ ifscCode: e.target.value.toUpperCase() })} placeholder="IFSC" /></Field>
              <Field label="Branch"><input value={form.branch} onChange={(e) => updateForm({ branch: e.target.value })} placeholder="Branch name" /></Field>
              <Field label="UPI ID"><input value={form.upiId} onChange={(e) => updateForm({ upiId: e.target.value })} placeholder="UPI ID" /></Field>
            </div>
          )}
        </section>

        <div className="staff-form-actions">
          <button type="button" className="staff-cancel-btn" onClick={() => router.push("/HR")}>Cancel</button>
          <button type="submit" className="staff-save-btn" disabled={saving}><Save size={16} /> {saving ? "Saving..." : isEditing ? "Update Staff" : "Save Staff"}</button>
        </div>
      </form>
      <StaffFormStyles />
    </main>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`staff-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function SkeletonLine({ className = "" }) {
  return <span className={`staff-skeleton-line ${className}`} />;
}

function StaffFormSkeleton() {
  return (
    <main className="staff-form-page">
      <div className="staff-form-topbar staff-skeleton-topbar">
        <SkeletonLine className="button" />
        <div>
          <SkeletonLine className="title" />
          <SkeletonLine className="subtitle" />
        </div>
        <SkeletonLine className="button save" />
      </div>
      <div className="staff-form-layout">
        {[3, 2, 2].map((rows, sectionIndex) => (
          <section className="staff-form-section" key={sectionIndex}>
            <div className="staff-section-title">
              <SkeletonLine className="icon" />
              <SkeletonLine className="section-title" />
            </div>
            <div className="staff-grid">
              {Array.from({ length: rows * 3 }).map((_, index) => (
                <label className={`staff-field ${sectionIndex === 1 && index === 3 ? "span-all" : ""}`} key={index}>
                  <SkeletonLine className="label" />
                  <SkeletonLine className={sectionIndex === 1 && index === 3 ? "textarea" : "input"} />
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
      <StaffFormStyles />
    </main>
  );
}

function StaffFormStyles() {
  return (
    <style jsx global>{`
      .staff-form-page {
        --staff-primary: #008069;
        --staff-primary-dark: #006b58;
        --staff-line: #d9e3e8;
        --staff-muted: #667781;
        --staff-text: #1f2c34;
        --staff-bg: #f3f6f8;
        min-height: 100vh;
        width: 100%;
        box-sizing: border-box;
        padding: 20px;
        background: var(--staff-bg);
        color: var(--staff-text);
      }
      .staff-form-topbar {
        width: 100%;
        max-width: none;
        margin: 0 0 14px;
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: center;
        gap: 16px;
      }
      .staff-form-topbar h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 750;
      }
      .staff-form-topbar p {
        margin: 4px 0 0;
        color: var(--staff-muted);
        font-size: 13px;
      }
      .staff-back-btn,
      .staff-cancel-btn,
      .staff-toggle-btn,
      .staff-save-btn {
        min-height: 38px;
        border-radius: 7px;
        border: 1.5px solid var(--staff-line);
        background: #fff;
        color: var(--staff-text);
        padding: 0 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 750;
        cursor: pointer;
      }
      .staff-save-btn {
        border-color: var(--staff-primary);
        background: var(--staff-primary);
        color: #fff;
      }
      .staff-save-btn:hover { background: var(--staff-primary-dark); }
      .staff-save-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
      .staff-form-layout,
      .staff-notice,
      .staff-form-loading {
        width: 100%;
        max-width: none;
        margin: 0;
      }
      .staff-form-layout {
        display: grid;
        gap: 12px;
      }
      .staff-form-section {
        background: #fff;
        border: 1px solid var(--staff-line);
        border-radius: 8px;
        padding: 16px;
      }
      .staff-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 13px;
      }
      .staff-section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 13px;
      }
      .staff-section-head .staff-section-title { margin-bottom: 0; }
      .staff-section-title svg {
        color: var(--staff-primary);
        flex-shrink: 0;
      }
      .staff-section-title h2 {
        margin: 0;
        font-size: 15px;
        font-weight: 750;
      }
      .staff-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      .staff-field {
        display: grid;
        gap: 5px;
      }
      .staff-field.span-all {
        grid-column: 1 / -1;
      }
      .staff-field span,
      .staff-readonly-box span {
        color: var(--staff-muted);
        font-size: 11px;
        font-weight: 750;
      }
      .staff-field input,
      .staff-field select,
      .staff-field textarea {
        width: 100%;
        min-height: 38px;
        border: 1.5px solid var(--staff-line);
        border-radius: 7px;
        background: #fff;
        color: var(--staff-text);
        padding: 7px 10px;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
      }
      .staff-field textarea {
        min-height: 92px;
        resize: vertical;
        line-height: 1.4;
      }
      .staff-field input:focus,
      .staff-field select:focus,
      .staff-field textarea:focus {
        border-color: var(--staff-primary);
        box-shadow: 0 0 0 3px rgba(0, 128, 105, 0.12);
      }
      .staff-field select:disabled {
        background: #f8fafc;
        color: #94a3b8;
      }
      .staff-inline-summary,
      .staff-readonly-box {
        margin-top: 12px;
        border: 1px solid var(--staff-line);
        border-radius: 7px;
        background: #f8fafc;
        padding: 10px 12px;
        display: grid;
        gap: 3px;
      }
      .staff-readonly-box {
        margin-top: 0;
        min-height: 66px;
        align-content: center;
      }
      .staff-inline-summary strong,
      .staff-readonly-box strong {
        font-size: 13px;
        font-weight: 750;
      }
      .staff-inline-summary span {
        color: var(--staff-muted);
        font-size: 12px;
      }
      .staff-form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding-bottom: 24px;
      }
      .staff-notice {
        margin-bottom: 12px;
        padding: 11px 14px;
        border-radius: 7px;
        border: 1px solid #fecaca;
        background: #fee2e2;
        color: #991b1b;
        font-size: 13px;
        font-weight: 700;
      }
      .staff-form-loading {
        min-height: 280px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--staff-muted);
        font-size: 14px;
      }
      .staff-skeleton-topbar {
        min-height: 56px;
      }
      .staff-skeleton-line {
        display: block;
        border-radius: 7px;
        background: linear-gradient(90deg, #edf2f5 25%, #f8fafc 37%, #edf2f5 63%);
        background-size: 400% 100%;
        animation: staffSkeletonPulse 1.25s ease-in-out infinite;
      }
      .staff-skeleton-line.button {
        width: 104px;
        height: 46px;
      }
      .staff-skeleton-line.button.save {
        width: 144px;
      }
      .staff-skeleton-line.title {
        width: 220px;
        height: 28px;
        margin-bottom: 10px;
      }
      .staff-skeleton-line.subtitle {
        width: min(420px, 70vw);
        height: 14px;
      }
      .staff-skeleton-line.icon {
        width: 18px;
        height: 18px;
        border-radius: 50%;
      }
      .staff-skeleton-line.section-title {
        width: 120px;
        height: 18px;
      }
      .staff-skeleton-line.label {
        width: 92px;
        height: 11px;
      }
      .staff-skeleton-line.input {
        width: 100%;
        height: 48px;
      }
      .staff-skeleton-line.textarea {
        width: 100%;
        height: 114px;
      }
      @keyframes staffSkeletonPulse {
        0% { background-position: 100% 50%; }
        100% { background-position: 0 50%; }
      }
      body[data-theme="dark"] .staff-form-page {
        --staff-bg: #111b21;
        --staff-text: #e9edef;
        --staff-line: #2a3942;
        --staff-muted: #aebac1;
        background: var(--staff-bg);
      }
      body[data-theme="dark"] .staff-form-section,
      body[data-theme="dark"] .staff-field input,
      body[data-theme="dark"] .staff-field select,
      body[data-theme="dark"] .staff-field textarea,
      body[data-theme="dark"] .staff-back-btn,
      body[data-theme="dark"] .staff-cancel-btn,
      body[data-theme="dark"] .staff-toggle-btn {
        background: #202c33;
        border-color: var(--staff-line);
        color: var(--staff-text);
      }
      body[data-theme="dark"] .staff-inline-summary,
      body[data-theme="dark"] .staff-readonly-box {
        background: #111b21;
        border-color: var(--staff-line);
      }
      body[data-theme="dark"] .staff-skeleton-line {
        background: linear-gradient(90deg, #22323b 25%, #2a3942 37%, #22323b 63%);
        background-size: 400% 100%;
      }
      @media (max-width: 900px) {
        .staff-form-topbar {
          grid-template-columns: 1fr;
          align-items: stretch;
        }
        .staff-save-btn,
        .staff-back-btn {
          width: fit-content;
        }
        .staff-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (max-width: 640px) {
        .staff-form-page {
          padding: 12px;
        }
        .staff-grid {
          grid-template-columns: 1fr;
        }
        .staff-section-head,
        .staff-form-actions {
          align-items: stretch;
          flex-direction: column;
        }
        .staff-form-actions .staff-save-btn,
        .staff-form-actions .staff-cancel-btn {
          width: 100%;
        }
      }
    `}</style>
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={<StaffFormSkeleton />}>
      <StaffFormRoute />
    </Suspense>
  );
}
