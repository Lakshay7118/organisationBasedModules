"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, CheckCircle, CreditCard, Save, UserRound } from "lucide-react";
import { Country, State, City } from "country-state-city";
import API from "../../utils/api";

const PAYROLL_CYCLE_OPTIONS = [1, 7, 15];
const COUNTRY_OPTIONS = Country.getAllCountries();

const localDate = (date = new Date()) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
};

const idOf = (item) => (item?._id || item?.id || "").toString();

const initialForm = {
  name: "",
  mobile: "",
  email: "",
  password: "",
  role: "user",
  employeeCode: "",
  department: "",
  designation: "",
  salaryBasis: "monthly",
  monthlySalary: "",
  expectedHoursPerDay: 8,
  payrollCycleDay: 1,
  joinDate: localDate(),
  status: "active",
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
};

export default function HrOnboardPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [departments, setDepartments] = useState([]);
  const [activeTab, setActiveTab] = useState("contact");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const states = useMemo(() => State.getStatesOfCountry(form.addressCountry || ""), [form.addressCountry]);
  const cities = useMemo(
    () => (form.addressCountry && form.addressState ? City.getCitiesOfState(form.addressCountry, form.addressState) : []),
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

  const salaryLabel = form.salaryBasis === "hourly"
    ? "Hourly Rate"
    : form.salaryBasis === "daily"
      ? "Daily Salary"
      : "Monthly Salary";

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const modules = Array.isArray(user.allowedModules) ? user.allowedModules : [];
    if (user.role !== "super_to_super_admin" && !modules.includes("hr")) {
      router.push("/contacts");
      return;
    }

    let cancelled = false;
    Promise.all([API.get("/hr/departments"), API.get("/hr/payroll/settings")])
      .then(([deptRes, settingsRes]) => {
        if (cancelled) return;
        const cycleDay = Number(settingsRes.data?.data?.cycleStartDay || 1);
        setDepartments(deptRes.data?.data || []);
        setForm((current) => ({
          ...current,
          payrollCycleDay: PAYROLL_CYCLE_OPTIONS.includes(cycleDay) ? cycleDay : 1,
        }));
      })
      .catch((error) => {
        setNotice({ type: "error", text: error.response?.data?.error || "Could not load HR form data." });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const submit = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!form.name.trim()) {
      setActiveTab("contact");
      return setNotice({ type: "error", text: "Name is required." });
    }
    if (!form.mobile.replace(/\s/g, "")) {
      setActiveTab("contact");
      return setNotice({ type: "error", text: "Mobile number is required." });
    }
    if (form.email && form.password && form.password.length < 6) {
      setActiveTab("contact");
      return setNotice({ type: "error", text: "Password must be at least 6 characters." });
    }

    const payload = {
      contact: {
        name: form.name.trim(),
        mobile: form.mobile.replace(/\s/g, ""),
        email: form.email.trim() || null,
        password: form.password || undefined,
        role: form.role,
      },
      staff: {
        employeeCode: form.employeeCode,
        name: form.name.trim(),
        phone: form.mobile.replace(/\s/g, ""),
        email: form.email.trim() || "",
        department: form.department || null,
        designation: form.designation,
        salaryBasis: form.salaryBasis,
        monthlySalary: Number(form.monthlySalary || 0),
        expectedHoursPerDay: Number(form.expectedHoursPerDay || 8),
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
        bankName: form.bankName,
        accountHolderName: form.accountHolderName,
        accountNumber: form.accountNumber,
        ifscCode: form.ifscCode,
        branch: form.branch,
        upiId: form.upiId,
      },
    };

    setSaving(true);
    try {
      const res = await API.post("/hr/contact-staff", payload);
      const staffId = idOf(res.data?.data?.staff);
      router.push(staffId ? `/HR?staff=${staffId}` : "/HR");
    } catch (error) {
      setNotice({ type: "error", text: error.response?.data?.error || "Could not save contact and staff." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24, color: "var(--app-text-muted)" }}>Loading HR onboarding...</div>;
  }

  return (
    <main className="hr-onboard-page">
      <style>{styles}</style>
      <div className="hr-onboard-head">
        <button type="button" onClick={() => router.push("/contacts")} className="ghost-btn">
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1>Add HR Contact</h1>
          <p>Create the contact, login account, staff profile, payroll, and bank details in one flow.</p>
        </div>
        <button type="submit" form="hr-onboard-form" className="primary-btn" disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save Contact & Staff"}
        </button>
      </div>

      {notice && <div className={`notice ${notice.type}`}>{notice.text}</div>}

      <form id="hr-onboard-form" onSubmit={submit} className="onboard-shell">
        <nav className="onboard-tabs">
          <button type="button" className={activeTab === "contact" ? "active" : ""} onClick={() => setActiveTab("contact")}><UserRound size={16} /> Contact</button>
          <button type="button" className={activeTab === "job" ? "active" : ""} onClick={() => setActiveTab("job")}><Briefcase size={16} /> Job & Salary</button>
          <button type="button" className={activeTab === "bank" ? "active" : ""} onClick={() => setActiveTab("bank")}><CreditCard size={16} /> Bank</button>
          <span><CheckCircle size={14} /> HR module</span>
        </nav>

        {activeTab === "contact" && (
          <section className="onboard-section">
            <h2>Contact & Login</h2>
            <div className="field-grid">
              <Field label="Name"><input value={form.name} onChange={(e) => update({ name: e.target.value })} placeholder="Full name" /></Field>
              <Field label="Mobile Number"><input value={form.mobile} onChange={(e) => update({ mobile: e.target.value })} placeholder="9876543210" /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={(e) => update({ email: e.target.value })} placeholder="name@company.com" /></Field>
              <Field label="Password"><input type="password" value={form.password} onChange={(e) => update({ password: e.target.value })} placeholder="Optional login password" /></Field>
              <Field label="Role">
                <select value={form.role} onChange={(e) => update({ role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="hr">HR</option>
                  <option value="manager">Manager</option>
                </select>
              </Field>
              <Field label="Employee Code"><input value={form.employeeCode} onChange={(e) => update({ employeeCode: e.target.value })} placeholder="EMP-001" /></Field>
            </div>
          </section>
        )}

        {activeTab === "job" && (
          <section className="onboard-section">
            <h2>Job, Address & Salary</h2>
            <div className="field-grid">
              <Field label="Department">
                <select value={form.department} onChange={(e) => update({ department: e.target.value })}>
                  <option value="">Select department</option>
                  {departments.map((department) => <option key={idOf(department)} value={idOf(department)}>{department.name}</option>)}
                </select>
              </Field>
              <Field label="Designation"><input value={form.designation} onChange={(e) => update({ designation: e.target.value })} placeholder="Executive" /></Field>
              <Field label="Salary Basis">
                <select value={form.salaryBasis} onChange={(e) => update({ salaryBasis: e.target.value })}>
                  <option value="monthly">Monthly</option>
                  <option value="daily">Daily</option>
                  <option value="hourly">Hourly</option>
                </select>
              </Field>
              <Field label={salaryLabel}><input type="number" min="0" value={form.monthlySalary} onChange={(e) => update({ monthlySalary: e.target.value })} placeholder="30000" /></Field>
              <Field label="Daily Work Hours"><input type="number" min="0" step="0.5" value={form.expectedHoursPerDay} onChange={(e) => update({ expectedHoursPerDay: e.target.value })} /></Field>
              {form.salaryBasis === "monthly" && (
                <Field label="Payroll Cycle">
                  <select value={form.payrollCycleDay} onChange={(e) => update({ payrollCycleDay: e.target.value })}>
                    {PAYROLL_CYCLE_OPTIONS.map((day) => <option key={day} value={day}>{day} to {day}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Joining Date"><input type="date" value={form.joinDate} onChange={(e) => update({ joinDate: e.target.value })} /></Field>
              <Field label="Country">
                <select value={form.addressCountry} onChange={(e) => update({ addressCountry: e.target.value, addressState: "", addressCity: "" })}>
                  <option value="">Select country</option>
                  {COUNTRY_OPTIONS.map((country) => <option key={country.isoCode} value={country.isoCode}>{country.name}</option>)}
                </select>
              </Field>
              <Field label="State">
                <select value={form.addressState} onChange={(e) => update({ addressState: e.target.value, addressCity: "" })}>
                  <option value="">Select state</option>
                  {states.map((state) => <option key={state.isoCode} value={state.isoCode}>{state.name}</option>)}
                </select>
              </Field>
              <Field label="City">
                <select value={form.addressCity} onChange={(e) => update({ addressCity: e.target.value })}>
                  <option value="">Select city</option>
                  {cities.map((city) => <option key={`${city.name}-${city.latitude}`} value={city.name}>{city.name}</option>)}
                </select>
              </Field>
              <Field label="House / Street" wide><textarea value={form.houseAddress} onChange={(e) => update({ houseAddress: e.target.value })} rows={3} placeholder="Address" /></Field>
            </div>
          </section>
        )}

        {activeTab === "bank" && (
          <section className="onboard-section">
            <h2>Bank Details</h2>
            <div className="field-grid">
              <Field label="Bank Name"><input value={form.bankName} onChange={(e) => update({ bankName: e.target.value })} placeholder="Bank name" /></Field>
              <Field label="Account Holder"><input value={form.accountHolderName} onChange={(e) => update({ accountHolderName: e.target.value })} placeholder="Account holder" /></Field>
              <Field label="Account Number"><input value={form.accountNumber} onChange={(e) => update({ accountNumber: e.target.value })} placeholder="Account number" /></Field>
              <Field label="IFSC Code"><input value={form.ifscCode} onChange={(e) => update({ ifscCode: e.target.value.toUpperCase() })} placeholder="IFSC" /></Field>
              <Field label="Branch"><input value={form.branch} onChange={(e) => update({ branch: e.target.value })} placeholder="Branch" /></Field>
              <Field label="UPI ID"><input value={form.upiId} onChange={(e) => update({ upiId: e.target.value })} placeholder="name@upi" /></Field>
            </div>
          </section>
        )}

        <div className="onboard-actions">
          <button type="button" className="ghost-btn" onClick={() => router.push("/contacts")}>Cancel</button>
          <button type="submit" className="primary-btn" disabled={saving}>
            <Save size={16} /> {saving ? "Saving..." : "Save Contact & Staff"}
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({ label, children, wide = false }) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const styles = `
  .hr-onboard-page { min-height: 100vh; padding: 18px; background: #f3f6f8; color: #111827; }
  .hr-onboard-head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 14px; margin-bottom: 14px; }
  .hr-onboard-head h1 { margin: 0; font-size: 24px; font-weight: 800; }
  .hr-onboard-head p { margin: 4px 0 0; color: #64748b; font-size: 13px; }
  .onboard-shell { background: #fff; border: 1px solid #d9e3e8; border-radius: 8px; overflow: hidden; }
  .onboard-tabs { height: 56px; display: flex; align-items: center; gap: 8px; padding: 0 14px; border-bottom: 1px solid #e5edf1; overflow-x: auto; }
  .onboard-tabs button, .ghost-btn, .primary-btn { min-height: 38px; border-radius: 7px; border: 1.5px solid #d9e3e8; background: #fff; color: #1f2937; padding: 0 14px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 13px; font-weight: 800; cursor: pointer; white-space: nowrap; }
  .onboard-tabs button.active { border-color: #008069; color: #008069; background: #e7f7f3; }
  .onboard-tabs span { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; color: #008069; font-size: 12px; font-weight: 800; white-space: nowrap; }
  .primary-btn { background: #008069; color: #fff; border-color: #008069; }
  .primary-btn:disabled { opacity: 0.65; cursor: not-allowed; }
  .onboard-section { padding: 18px; }
  .onboard-section h2 { margin: 0 0 14px; font-size: 16px; font-weight: 800; }
  .field-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
  .field { display: grid; gap: 6px; }
  .field.wide { grid-column: 1 / -1; }
  .field span { color: #64748b; font-size: 11px; font-weight: 800; }
  .field input, .field select, .field textarea { width: 100%; min-height: 40px; border: 1.5px solid #d9e3e8; border-radius: 7px; padding: 8px 10px; background: #fff; color: #111827; outline: none; box-sizing: border-box; font-size: 13px; }
  .field textarea { resize: vertical; line-height: 1.4; }
  .field input:focus, .field select:focus, .field textarea:focus { border-color: #008069; box-shadow: 0 0 0 3px rgba(0,128,105,0.12); }
  .onboard-actions { border-top: 1px solid #e5edf1; padding: 14px 18px; display: flex; justify-content: flex-end; gap: 10px; }
  .notice { margin-bottom: 12px; padding: 11px 14px; border-radius: 7px; font-size: 13px; font-weight: 800; }
  .notice.error { border: 1px solid #fecaca; background: #fee2e2; color: #991b1b; }
  body[data-theme="dark"] .hr-onboard-page { background: #111b21; color: #e9edef; }
  body[data-theme="dark"] .onboard-shell, body[data-theme="dark"] .field input, body[data-theme="dark"] .field select, body[data-theme="dark"] .field textarea, body[data-theme="dark"] .ghost-btn, body[data-theme="dark"] .onboard-tabs button { background: #202c33; color: #e9edef; border-color: #2a3942; }
  body[data-theme="dark"] .onboard-tabs, body[data-theme="dark"] .onboard-actions { border-color: #2a3942; }
  @media (max-width: 900px) { .hr-onboard-head { grid-template-columns: 1fr; align-items: stretch; } .field-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .hr-onboard-head .primary-btn { width: fit-content; } }
  @media (max-width: 640px) { .hr-onboard-page { padding: 10px; } .field-grid { grid-template-columns: 1fr; } .onboard-actions { flex-direction: column; } .onboard-actions button { width: 100%; } }
`;
