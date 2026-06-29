"use client";

import { Plus, Save, Trash2, X } from "lucide-react";

export const DEPARTMENT_DAY_OPTIONS = [
  { id: 0, label: "Sun" },
  { id: 1, label: "Mon" },
  { id: 2, label: "Tue" },
  { id: 3, label: "Wed" },
  { id: 4, label: "Thu" },
  { id: 5, label: "Fri" },
  { id: 6, label: "Sat" },
];

export const DEPARTMENT_BREAK_OPTIONS = [
  { value: 30, label: "0.5 hr" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hr" },
  { value: 90, label: "1.5 hr" },
  { value: 120, label: "2 hr" },
];

export const defaultDepartmentShift = {
  name: "General",
  start: "09:00",
  end: "18:00",
  breakMinutes: 60,
};

export const emptyDepartmentForm = {
  name: "",
  description: "",
  weeklyOffDays: [0],
  shift: defaultDepartmentShift,
  shifts: [defaultDepartmentShift],
  leavePolicy: { paidLeaves: 0, shortLeaves: 0 },
  superAdmin: null,
};

function timeToMinutes(time) {
  if (!time || typeof time !== "string") return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (![hours, minutes].every(Number.isFinite)) return null;
  return hours * 60 + minutes;
}

function calculateWorkHours(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return 0;
  const adjustedEnd = end < start ? end + 24 * 60 : end;
  return Math.round(((adjustedEnd - start) / 60) * 100) / 100;
}

function shiftWorkHours(shift = {}) {
  return Math.round(
    Math.max(0, calculateWorkHours(shift.start, shift.end) - Number(shift.breakMinutes || 0) / 60) * 100
  ) / 100;
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`hr-field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function DepartmentForm({
  departmentForm,
  setDepartmentForm,
  editingDepartmentId = "",
  saving = false,
  onSubmit,
  onCancelEdit,
}) {
  const shifts = departmentForm.shifts || [departmentForm.shift || defaultDepartmentShift];

  return (
    <div className="hr-tools-panel hr-department-panel">
      <form className="hr-form-grid-2 hr-department-form" onSubmit={onSubmit}>
        <Field label="Name">
          <input
            value={departmentForm.name}
            onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
            placeholder="Sales"
          />
        </Field>
        <Field label="Description">
          <input
            value={departmentForm.description}
            onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
            placeholder="Optional"
          />
        </Field>
        <div className="hr-span2 hr-shift-editor">
          <div className="hr-shift-editor-head">
            <label className="hr-field-label">Shifts</label>
          </div>
          {shifts.map((shift, index) => (
            <div className="hr-shift-editor-row" key={shift._id || index}>
              <label className="hr-shift-cell">
                <span>Shift Name</span>
                <input
                  value={shift.name || ""}
                  onChange={(e) => {
                    const next = [...shifts];
                    next[index] = { ...next[index], name: e.target.value };
                    setDepartmentForm({ ...departmentForm, shifts: next, shift: next[0] });
                  }}
                  placeholder="General"
                />
              </label>
              <label className="hr-shift-cell">
                <span>Start Time</span>
                <input
                  type="time"
                  value={shift.start || ""}
                  onChange={(e) => {
                    const next = [...shifts];
                    next[index] = { ...next[index], start: e.target.value };
                    setDepartmentForm({ ...departmentForm, shifts: next, shift: next[0] });
                  }}
                />
              </label>
              <label className="hr-shift-cell">
                <span>End Time</span>
                <input
                  type="time"
                  value={shift.end || ""}
                  onChange={(e) => {
                    const next = [...shifts];
                    next[index] = { ...next[index], end: e.target.value };
                    setDepartmentForm({ ...departmentForm, shifts: next, shift: next[0] });
                  }}
                />
              </label>
              <label className="hr-shift-cell hr-shift-break-cell">
                <span>Break</span>
                <select
                  value={shift.breakMinutes ?? 60}
                  onChange={(e) => {
                    const next = [...shifts];
                    next[index] = { ...next[index], breakMinutes: Number(e.target.value) };
                    setDepartmentForm({ ...departmentForm, shifts: next, shift: next[0] });
                  }}
                >
                  {DEPARTMENT_BREAK_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="hr-shift-hours">
                <span>Hours</span>
                <strong>{shiftWorkHours(shift)}h</strong>
              </div>
              <div className="hr-shift-action">
                <span>Action</span>
                <button
                  type="button"
                  className="hr-icon-btn"
                  onClick={() => {
                    const next = shifts.filter((_, shiftIndex) => shiftIndex !== index);
                    const finalShifts = next.length ? next : [defaultDepartmentShift];
                    setDepartmentForm({ ...departmentForm, shifts: finalShifts, shift: finalShifts[0] });
                  }}
                  disabled={shifts.length <= 1}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="hr-btn hr-btn-ghost compact hr-add-shift-btn"
            onClick={() => {
              const next = [...shifts, { ...defaultDepartmentShift, name: `Shift ${shifts.length + 1}` }];
              setDepartmentForm({ ...departmentForm, shifts: next, shift: next[0] });
            }}
          >
            <Plus size={14} /> Add Shift
          </button>
        </div>
        <Field label="Paid Leave / Cycle">
          <input
            type="number"
            min="0"
            value={departmentForm.leavePolicy?.paidLeaves ?? 0}
            onChange={(e) =>
              setDepartmentForm({
                ...departmentForm,
                leavePolicy: { ...(departmentForm.leavePolicy || {}), paidLeaves: e.target.value },
              })
            }
          />
        </Field>
        <Field label="Short Leave / Cycle">
          <input
            type="number"
            min="0"
            value={departmentForm.leavePolicy?.shortLeaves ?? 0}
            onChange={(e) =>
              setDepartmentForm({
                ...departmentForm,
                leavePolicy: { ...(departmentForm.leavePolicy || {}), shortLeaves: e.target.value },
              })
            }
          />
        </Field>
        <div className="hr-span2 hr-weekly-off-field">
          <label className="hr-field-label">Weekly Off Days</label>
          <div className="hr-day-checks">
            {DEPARTMENT_DAY_OPTIONS.map((day) => {
              const checked = (departmentForm.weeklyOffDays || []).map(Number).includes(day.id);
              return (
                <label key={day.id} className={`hr-day-check ${checked ? "active" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const current = (departmentForm.weeklyOffDays || []).map(Number);
                      const next = checked ? current.filter((x) => x !== day.id) : [...current, day.id];
                      setDepartmentForm({ ...departmentForm, weeklyOffDays: next });
                    }}
                  />
                  {day.label}
                </label>
              );
            })}
          </div>
        </div>
        <div className="hr-span2 hr-form-actions-row hr-department-actions">
          {editingDepartmentId && (
            <button type="button" className="hr-btn hr-btn-ghost" onClick={onCancelEdit}>
              Cancel
            </button>
          )}
          <button type="submit" className="hr-btn hr-btn-primary" disabled={saving}>
            <Save size={14} /> {editingDepartmentId ? "Update" : "Add Department"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function DepartmentFormModal({
  open,
  title = "Add Department",
  onClose,
  departmentForm,
  setDepartmentForm,
  editingDepartmentId = "",
  saving = false,
  onSubmit,
  onCancelEdit,
}) {
  if (!open) return null;

  return (
    <div className="hr-modal-backdrop" onClick={onClose}>
      <style jsx global>{departmentModalStyles}</style>
      <div className="hr-modal department-modal" onClick={(e) => e.stopPropagation()}>
        <div className="hr-modal-header">
          <h3>{title}</h3>
          <button type="button" className="hr-icon-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <DepartmentForm
          departmentForm={departmentForm}
          setDepartmentForm={setDepartmentForm}
          editingDepartmentId={editingDepartmentId}
          saving={saving}
          onSubmit={onSubmit}
          onCancelEdit={onCancelEdit}
        />
      </div>
    </div>
  );
}

const departmentModalStyles = `
  .hr-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(3px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    z-index: 1000;
  }
  .hr-modal {
    width: min(720px, 96vw);
    max-height: 90vh;
    overflow: hidden;
    background: #fff;
    border-radius: 10px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.25);
    display: flex;
    flex-direction: column;
  }
  .department-modal {
    width: min(760px, 96vw);
  }
  .hr-modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 18px 22px 14px;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .hr-modal-header h3 {
    margin: 0;
    color: #0f172a;
    font-size: 18px;
    font-weight: 800;
  }
  .hr-tools-panel {
    padding: 16px 22px 20px;
    overflow-y: auto;
  }
  .hr-form-grid-2 {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 14px;
  }
  .hr-span2 {
    grid-column: 1 / -1;
  }
  .hr-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
  }
  .hr-field input,
  .hr-field select,
  .hr-shift-editor-row input,
  .hr-shift-editor-row select {
    width: 100%;
    min-height: 40px;
    border: 1px solid #dbe3eb;
    border-radius: 8px;
    padding: 0 11px;
    color: #0f172a;
    background: #fff;
    outline: none;
    font-size: 13px;
  }
  .hr-field input:focus,
  .hr-field select:focus,
  .hr-shift-editor-row input:focus,
  .hr-shift-editor-row select:focus {
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.12);
  }
  .hr-field-label {
    color: #475569;
    font-size: 12px;
    font-weight: 800;
  }
  .hr-shift-editor {
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 12px;
    background: #f8fafc;
  }
  .hr-shift-editor-row {
    display: grid;
    grid-template-columns: minmax(150px, 1.45fr) minmax(115px, 0.8fr) minmax(115px, 0.8fr) minmax(115px, 0.8fr) 74px 60px;
    gap: 8px;
    align-items: end;
  }
  .hr-shift-cell,
  .hr-shift-hours,
  .hr-shift-action {
    display: flex;
    flex-direction: column;
    gap: 5px;
    color: #64748b;
    font-size: 11px;
    font-weight: 800;
  }
  .hr-shift-hours strong {
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #dbe3eb;
    border-radius: 8px;
    background: #fff;
    color: #0f172a;
  }
  .hr-btn {
    min-height: 38px;
    border-radius: 999px;
    padding: 0 14px;
    border: 1px solid #dbe3eb;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    background: #fff;
    color: #334155;
  }
  .hr-btn-primary {
    border-color: transparent;
    color: #fff;
    background: linear-gradient(135deg, #0f5f64 0%, #14808a 65%, #22c55e 100%);
  }
  .hr-btn-ghost {
    background: #fff;
  }
  .hr-btn.compact {
    min-height: 34px;
    padding: 0 12px;
  }
  .hr-icon-btn {
    width: 38px;
    height: 38px;
    border: 1px solid #dbe3eb;
    border-radius: 10px;
    background: #fff;
    color: #334155;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }
  .hr-form-actions-row {
    display: flex;
    justify-content: flex-end;
    gap: 9px;
  }
  .hr-day-checks {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }
  .hr-day-check {
    min-width: 54px;
    min-height: 34px;
    border: 1px solid #dbe3eb;
    border-radius: 9px;
    background: #f8fafc;
    color: #0f172a;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 10px;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }
  .hr-day-check input {
    display: none;
  }
  .hr-day-check.active {
    border-color: #14b8a6;
    background: #ccfbf1;
    color: #0f766e;
  }
  @media (max-width: 760px) {
    .hr-modal-backdrop {
      align-items: flex-start;
      padding: 12px;
    }
    .hr-form-grid-2 {
      grid-template-columns: 1fr;
    }
    .hr-span2 {
      grid-column: auto;
    }
    .hr-shift-editor-row {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
`;
