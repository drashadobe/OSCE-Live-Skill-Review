import React, { useState } from 'react';
import type { UserDetails } from '../types';

interface WelcomeFormProps {
  onSubmit: (details: UserDetails, duration: number) => void;
}

const WelcomeForm: React.FC<WelcomeFormProps> = ({ onSubmit }) => {
  const [details, setDetails] = useState<Omit<UserDetails, 'email'>>({
    name: '',
    phone: '',
    designation: '',
  });
  const [duration, setDuration] = useState<string>('10');

  const [errors, setErrors] = useState<Partial<UserDetails> & { duration?: string }>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDetails(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof UserDetails]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDuration(e.target.value);
    if (errors.duration) {
      setErrors(prev => ({ ...prev, duration: undefined }));
    }
  };

  const validate = () => {
    const newErrors: Partial<UserDetails> & { duration?: string } = {};
    if (!details.name.trim()) newErrors.name = 'Full name is required.';
    if (!details.phone.trim()) newErrors.phone = 'Phone number is required.';
    if (!details.designation.trim()) newErrors.designation = 'Designation is required.';
    if (!duration.trim()) {
        newErrors.duration = 'Duration is required.';
    } else {
        const numDuration = parseInt(duration, 10);
        if (isNaN(numDuration) || numDuration <= 0) {
            newErrors.duration = 'Must be a positive whole number.';
        }
    }
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(details as UserDetails, parseInt(duration, 10));
  };

  const isFormIncomplete = Object.values(details).some(value => value === '') || duration.trim() === '';

  return (
    <div className="fixed inset-0 bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-blue-950/60 backdrop-blur-sm p-8 rounded-lg shadow-2xl border border-blue-800/50">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-100">OSCE Live Skill Review</h1>
          <p className="text-slate-400 mt-2">Enter your details to begin the evaluation.</p>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={details.name}
                onChange={handleChange}
                className="w-full bg-gray-900/70 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && <p id="name-error" className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={details.phone}
                onChange={handleChange}
                className="w-full bg-gray-900/70 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />
              {errors.phone && <p id="phone-error" className="text-red-400 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="designation" className="block text-sm font-medium text-slate-300 mb-1">Designation</label>
              <input
                type="text"
                id="designation"
                name="designation"
                value={details.designation}
                onChange={handleChange}
                className="w-full bg-gray-900/70 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
                aria-describedby={errors.designation ? 'designation-error' : undefined}
              />
              {errors.designation && <p id="designation-error" className="text-red-400 text-xs mt-1">{errors.designation}</p>}
            </div>
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-slate-300 mb-1">Session Duration (minutes)</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={duration}
                onChange={handleDurationChange}
                className="w-full bg-gray-900/70 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                required
                min="1"
                step="1"
                aria-describedby={errors.duration ? 'duration-error' : undefined}
              />
              {errors.duration && <p id="duration-error" className="text-red-400 text-xs mt-1">{errors.duration}</p>}
            </div>
          </div>
          <div className="mt-8">
            <button
              type="submit"
              disabled={isFormIncomplete}
              className="w-full px-6 py-3 rounded-md font-semibold text-white transition-all bg-violet-600 hover:bg-violet-700 disabled:bg-slate-500 disabled:cursor-not-allowed"
            >
              Start Evaluation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WelcomeForm;