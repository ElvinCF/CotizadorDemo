type ValidatedNumberFieldProps = {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  invalid: boolean;
  errorText: string;
  labelClassName?: string;
};

function ValidatedNumberField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  invalid,
  errorText,
  labelClassName,
}: ValidatedNumberFieldProps) {
  return (
    <label className={[labelClassName, invalid ? "has-error" : ""].filter(Boolean).join(" ")}>
      {label}
      <div className="field-control">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          className={invalid ? "is-invalid" : ""}
          onChange={(event) => onChange(Number(event.target.value || 0))}
        />
        {invalid ? (
          <>
            <span className="field-alert-icon" aria-hidden="true">
              !
            </span>
            <small className="field-error-bubble" role="alert">
              {errorText}
            </small>
          </>
        ) : null}
      </div>
    </label>
  );
}

export default ValidatedNumberField;
