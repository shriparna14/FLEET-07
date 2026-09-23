import React, { useState } from 'react';
import Modal from '../common/Modal';

// Receives accessibleVendors (pre-scoped), the addVehicle action, and all
// existing vehicles for duplicate-registration validation.
export default function AddVehicleModal({ isOpen, onClose, accessibleVendors, addVehicle, vehicles }) {
  const [form, setForm] = useState({
    registrationNumber: '',
    model: '',
    seatingCapacity: 4,
    fuelType: 'Petrol',
    vendorId: '',
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    const reg = form.registrationNumber.trim().toUpperCase();

    if (!reg) {
      errs.registrationNumber = 'Registration number is required.';
    } else if (reg.length < 6 || reg.length > 12) {
      errs.registrationNumber = 'Enter a valid registration format (e.g. PB10AB1234).';
    } else if (vehicles.some(v => v.registrationNumber.toUpperCase() === reg)) {
      errs.registrationNumber = 'Registration number already exists in fleet.';
    }

    if (!form.model.trim()) errs.model = 'Vehicle model is required.';

    if (!form.seatingCapacity || form.seatingCapacity < 1 || form.seatingCapacity > 60) {
      errs.seatingCapacity = 'Enter a seating capacity between 1 and 60.';
    }

    if (!form.vendorId) errs.vendorId = 'Please select the owning vendor.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = addVehicle(form);
    if (result.success) {
      handleClose();
    } else {
      setErrors({ general: result.reason || 'Failed to onboard vehicle.' });
    }
  };

  const handleClose = () => {
    setForm({ registrationNumber: '', model: '', seatingCapacity: 4, fuelType: 'Petrol', vendorId: '' });
    setErrors({});
    onClose();
  };

  const field = (key) => ({
    onChange: (e) => {
      setForm(prev => ({ ...prev, [key]: e.target.value }));
      if (errors[key]) setErrors(prev => ({ ...prev, [key]: '' }));
    },
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Vehicle"
      subtitle="Register and onboard a cab into the operating fleet."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 text-xs select-none">
        {errors.general && (
          <div className="p-2.5 rounded-[6px] bg-danger/10 border border-danger/25 text-danger font-medium">
            {errors.general}
          </div>
        )}

        <div>
          <label className="block font-semibold text-muted uppercase text-[10px] tracking-wider mb-1">
            Registration Number *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. PB10AB1234"
            value={form.registrationNumber}
            onChange={e => {
              setForm(prev => ({ ...prev, registrationNumber: e.target.value.toUpperCase() }));
              if (errors.registrationNumber) setErrors(prev => ({ ...prev, registrationNumber: '' }));
            }}
            className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none font-mono font-bold"
          />
          {errors.registrationNumber && (
            <p className="text-danger text-[10px] mt-1">{errors.registrationNumber}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-muted uppercase text-[10px] tracking-wider mb-1">
              Model *
            </label>
            <input
              type="text"
              required
              placeholder="Swift Dzire"
              value={form.model}
              {...field('model')}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none font-medium"
            />
            {errors.model && <p className="text-danger text-[10px] mt-1">{errors.model}</p>}
          </div>
          <div>
            <label className="block font-semibold text-muted uppercase text-[10px] tracking-wider mb-1">
              Seats *
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={form.seatingCapacity}
              onChange={e => setForm(prev => ({ ...prev, seatingCapacity: Number(e.target.value) }))}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none font-mono"
            />
            {errors.seatingCapacity && <p className="text-danger text-[10px] mt-1">{errors.seatingCapacity}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-muted uppercase text-[10px] tracking-wider mb-1">
              Fuel Type *
            </label>
            <select
              value={form.fuelType}
              onChange={e => setForm(prev => ({ ...prev, fuelType: e.target.value }))}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none font-medium"
            >
              <option value="Petrol">Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="CNG">CNG</option>
              <option value="Electric">Electric (EV)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-muted uppercase text-[10px] tracking-wider mb-1">
              Owning Vendor *
            </label>
            <select
              required
              value={form.vendorId}
              onChange={e => {
                setForm(prev => ({ ...prev, vendorId: e.target.value }));
                if (errors.vendorId) setErrors(prev => ({ ...prev, vendorId: '' }));
              }}
              className="w-full px-3 py-1.5 bg-background border border-border rounded-[6px] text-text focus:border-primary outline-none font-medium"
            >
              <option value="">Select vendor…</option>
              {accessibleVendors.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            {errors.vendorId && <p className="text-danger text-[10px] mt-1">{errors.vendorId}</p>}
          </div>
        </div>

        <p className="text-[11px] text-muted p-2.5 bg-background border border-border rounded-[6px]">
          <span className="font-bold text-text">Auto-generated:</span> RC, Insurance, Permit, and PUCC
          documents are created automatically with PENDING verification status.
        </p>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            className="px-3.5 py-1.5 text-xs font-semibold text-text bg-surface hover:bg-background border border-border rounded-[6px] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary/90 rounded-[6px] transition-all"
          >
            Onboard Vehicle
          </button>
        </div>
      </form>
    </Modal>
  );
}
