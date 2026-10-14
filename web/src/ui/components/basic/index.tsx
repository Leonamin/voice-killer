import { X } from "lucide-react";
import {
  useId,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  type ComponentPropsWithRef,
  type AnchorHTMLAttributes,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
  type CSSProperties,
} from "react";
export function Button({
  children,
  isLoading = false,
  variant = "primary",
  disabled,
  ...props
}: ComponentPropsWithRef<"button"> & {
  isLoading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      {...props}
      type={props.type ?? "button"}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`gc-button gc-button-${variant} ${props.className ?? ""}`}
    >
      <span
        className={`gc-button-content ${isLoading ? "gc-button-hidden" : ""}`}
      >
        {children}
      </span>
      {isLoading && (
        <span className="gc-button-loading" aria-label="처리 중">
          •••
        </span>
      )}
    </button>
  );
}
export function IconButton({
  label,
  children,
  appearance = "ghost",
  size = "default",
  ...props
}: Omit<Parameters<typeof Button>[0], "aria-label"> & {
  label: string;
  appearance?: "ghost" | "filled";
  size?: "default" | "compact";
}) {
  return (
    <Button
      {...props}
      aria-label={label}
      className={`gc-icon-button gc-icon-button-${appearance} gc-icon-button-${size} ${props.className ?? ""}`}
    >
      {children}
    </Button>
  );
}
export function Link({
  children,
  shouldLookLikeButton = false,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  shouldLookLikeButton?: boolean;
}) {
  return (
    <a
      {...props}
      className={`gc-link ${shouldLookLikeButton ? "gc-link-button" : ""} ${props.className ?? ""}`}
    >
      {children}
    </a>
  );
}
export type FieldProps = {
  label: string;
  description?: string;
  error?: string;
};
export function TextField({
  label,
  description,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <div className="gc-field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        {...props}
        id={id}
        className="gc-input"
        aria-invalid={!!error}
        aria-describedby={error || description ? `${id}-help` : undefined}
      />
      {(error || description) && (
        <small id={`${id}-help`} className={error ? "gc-error" : "gc-help"}>
          {error || description}
        </small>
      )}
    </div>
  );
}
export function TextArea({
  label,
  description,
  error,
  shouldAutoSize = false,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> &
  FieldProps & { shouldAutoSize?: boolean }) {
  const generated = useId();
  const id = props.id ?? generated;
  const ref = useRef<HTMLTextAreaElement>(null);
  const [currentText, setCurrentText] = useState(
    String(props.defaultValue ?? ""),
  );
  const resize = () => {
    if (shouldAutoSize && ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = `${Math.min(240, Math.max(90, ref.current.scrollHeight))}px`;
    }
  };
  useEffect(resize, [props.value, shouldAutoSize]);
  return (
    <div className="gc-field">
      <label htmlFor={id}>
        {label}
        {props.required && <span aria-hidden="true"> *</span>}
      </label>
      <textarea
        {...props}
        ref={ref}
        id={id}
        className="gc-input gc-textarea"
        aria-invalid={!!error}
        aria-describedby={error || description ? `${id}-help` : undefined}
        onChange={(event) => {
          setCurrentText(event.target.value);
          resize();
          props.onChange?.(event);
        }}
      />
      {props.maxLength !== undefined && (
        <small className="gc-help">
          {String(props.value ?? currentText).length} / {props.maxLength}
        </small>
      )}
      {(error || description) && (
        <small id={`${id}-help`} className={error ? "gc-error" : "gc-help"}>
          {error || description}
        </small>
      )}
    </div>
  );
}
export function Checkbox({
  label,
  isChecked,
  isMixed = false,
  isDisabled = false,
  onCheckedChange,
}: {
  label: string;
  isChecked: boolean;
  isMixed?: boolean;
  isDisabled?: boolean;
  onCheckedChange: (isChecked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = isMixed;
  }, [isMixed]);
  return (
    <label className="gc-choice">
      <input
        className="gc-checkbox-input"
        type="checkbox"
        ref={ref}
        checked={isChecked}
        disabled={isDisabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
export function RadioGroup({
  label,
  value,
  options,
  onValueChange,
  isDisabled = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onValueChange: (value: string) => void;
  isDisabled?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="gc-radio" disabled={isDisabled}>
      <legend>{label}</legend>
      {options.map((option) => (
        <label className="gc-choice" key={option.value}>
          <input
            className="gc-radio-input"
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onValueChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
export function Switch({
  label,
  isChecked,
  isDisabled = false,
  onCheckedChange,
}: {
  label: string;
  isChecked: boolean;
  isDisabled?: boolean;
  onCheckedChange: (isChecked: boolean) => void;
}) {
  return (
    <label className="gc-choice">
      <input
        className="gc-switch"
        role="switch"
        type="checkbox"
        checked={isChecked}
        disabled={isDisabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
      />
      {label}
    </label>
  );
}
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning";
}) {
  return <span className={`gc-badge gc-tone-${tone}`}>{children}</span>;
}
export function Alert({
  title,
  children,
  tone = "neutral",
  onDismiss,
  action,
}: {
  title: string;
  children?: ReactNode;
  tone?: "neutral" | "success" | "danger" | "warning";
  onDismiss?: () => void;
  action?: ReactNode;
}) {
  return (
    <div
      className={`gc-alert gc-tone-${tone}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <div>
        <strong>{title}</strong>
        {children && <div>{children}</div>}
        {action}
      </div>
      {onDismiss && (
        <IconButton
          label="알림 닫기"
          appearance="ghost"
          className="gc-alert-close"
          onClick={onDismiss}
        >
          <X size={16} aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
}
export function Skeleton({
  width = "100%",
  height = 18,
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
}) {
  return (
    <span
      className="gc-skeleton"
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
export function Progress({
  label,
  value,
  size = "regular",
}: {
  label: string;
  value?: number;
  size?: "thin" | "regular" | "thick";
}) {
  const labelId = useId();
  const meterRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const [placement, setPlacement] = useState<{
    mode: "inside" | "outside" | "below";
    left: number;
  }>({ mode: "below", left: 0 });
  const normalized =
    value === undefined || !Number.isFinite(value)
      ? undefined
      : Math.min(100, Math.max(0, value));
  const isIndeterminate = normalized === undefined;
  const percentage =
    normalized === undefined ? undefined : `${Math.round(normalized)}%`;
  useLayoutEffect(() => {
    if (size !== "thick" || normalized === undefined) return;
    const track = trackRef.current;
    const number = numberRef.current;
    const meter = meterRef.current;
    if (!track || !number || !meter) return;
    let isActive = true;
    function measure() {
      if (!isActive || !track || !number || !meter) return;
      // Measure the actual styled text plus its token padding, even when the below fallback wraps.
      const previousMaxWidth = number.style.maxWidth;
      const previousWhiteSpace = number.style.whiteSpace;
      const previousPadding = number.style.paddingInline;
      const gap = parseFloat(getComputedStyle(meter).rowGap) || 0;
      number.style.paddingInline = `${gap}px`;
      number.style.maxWidth = "none";
      number.style.whiteSpace = "nowrap";
      const textWidth = number.getBoundingClientRect().width;
      number.style.maxWidth = previousMaxWidth;
      number.style.whiteSpace = previousWhiteSpace;
      number.style.paddingInline = previousPadding;
      const trackWidth = track.getBoundingClientRect().width;
      const fillWidth = (trackWidth * normalized!) / 100;
      const mode =
        fillWidth >= textWidth
          ? "inside"
          : trackWidth - fillWidth >= textWidth + gap
            ? "outside"
            : "below";
      const left =
        mode === "inside"
          ? fillWidth / 2
          : mode === "outside"
            ? fillWidth + gap
            : 0;
      setPlacement((current) =>
        current.mode === mode && Math.abs(current.left - left) < 0.01
          ? current
          : { mode, left },
      );
    }
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(track);
    resize.observe(number);
    const mutation = new MutationObserver(measure);
    // Theme, density, font and token overrides can change without changing the track width.
    for (
      let ancestor: HTMLElement | null = meter;
      ancestor;
      ancestor = ancestor.parentElement
    )
      mutation.observe(ancestor, {
        attributes: true,
        attributeFilter: ["class", "style", "data-theme", "data-density"],
      });
    document.fonts.addEventListener("loadingdone", measure);
    void document.fonts.ready.then(measure);
    return () => {
      isActive = false;
      resize.disconnect();
      mutation.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [size, normalized, percentage]);
  return (
    <div className={`gc-progress gc-progress-${size}`}>
      <div className="gc-progress-label">
        <span id={labelId}>{label}</span>
        {size !== "thick" && percentage && (
          <span aria-hidden="true">{percentage}</span>
        )}
      </div>
      <div
        ref={meterRef}
        className={`gc-progress-meter gc-progress-number-${placement.mode}`}
      >
        <div
          ref={trackRef}
          className={`gc-progress-track ${isIndeterminate ? "gc-progress-indeterminate" : ""}`}
          role="progressbar"
          aria-labelledby={labelId}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={normalized}
          aria-valuetext={isIndeterminate ? "처리 중" : percentage}
        >
          <span
            className="gc-progress-fill"
            style={isIndeterminate ? undefined : { width: `${normalized}%` }}
          />
        </div>
        {size === "thick" && percentage && (
          <span
            ref={numberRef}
            className="gc-progress-number"
            style={
              placement.mode === "below" ? undefined : { left: placement.left }
            }
            aria-hidden="true"
          >
            {percentage}
          </span>
        )}
      </div>
    </div>
  );
}
export function Image({
  src,
  alt,
  aspectRatio = "4 / 3",
  className = "",
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);
  return (
    <div className={`gc-image ${className}`} style={{ aspectRatio }}>
      {hasError ? (
        <span
          role="img"
          aria-label={alt ? `${alt} — 이미지 로드 실패` : "이미지 로드 실패"}
        >
          이미지를 불러올 수 없어요
        </span>
      ) : (
        <>
          <img
            src={src}
            alt={alt}
            onError={() => setHasError(true)}
            onLoad={() => setIsLoaded(true)}
          />
          {!isLoaded && (
            <span className="gc-image-placeholder" aria-hidden="true">
              불러오는 중
            </span>
          )}
        </>
      )}
    </div>
  );
}
export function Avatar({
  src,
  name,
  size = 44,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => setHasError(false), [src]);
  return (
    <span className="gc-avatar" style={{ width: size, height: size }}>
      {src && !hasError ? (
        <img src={src} alt={name} onError={() => setHasError(true)} />
      ) : (
        <span role="img" aria-label={name}>
          {name.trim().slice(0, 2)}
        </span>
      )}
    </span>
  );
}
export function Card({
  title,
  children,
  footer,
}: {
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="gc-card">
      {title && <header>{title}</header>}
      <div>{children}</div>
      {footer && <footer>{footer}</footer>}
    </section>
  );
}
export function Table({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: ReactNode[];
  rows: ReactNode[][];
}) {
  return (
    <div
      className="gc-table-wrap"
      tabIndex={0}
      role="region"
      aria-label={`${caption} 표 스크롤`}
    >
      <table className="gc-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((header, index) => (
              <th scope="col" key={index}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pagination({
  page,
  totalPages,
  onPageChange,
  isLoading = false,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}) {
  const safeTotal = Math.max(1, totalPages);
  return (
    <nav className="gc-pagination" aria-label="페이지 탐색">
      <Button
        variant="secondary"
        disabled={page <= 1 || isLoading}
        onClick={() => onPageChange(1)}
      >
        처음
      </Button>
      <Button
        variant="secondary"
        disabled={page <= 1 || isLoading}
        onClick={() => onPageChange(page - 1)}
      >
        이전
      </Button>
      <span aria-live="polite">
        {page} / {safeTotal}
      </span>
      <Button
        variant="secondary"
        disabled={page >= safeTotal || isLoading}
        onClick={() => onPageChange(page + 1)}
      >
        다음
      </Button>
      <Button
        variant="secondary"
        disabled={page >= safeTotal || isLoading}
        onClick={() => onPageChange(safeTotal)}
      >
        마지막
      </Button>
    </nav>
  );
}
export function Typography({
  children,
  variant = "body",
}: {
  children: ReactNode;
  variant?: "title" | "heading" | "body" | "caption";
}) {
  return variant === "title" ? (
    <h2 className="gc-type-title">{children}</h2>
  ) : variant === "heading" ? (
    <h3 className="gc-type-heading">{children}</h3>
  ) : (
    <p className={`gc-type-${variant}`}>{children}</p>
  );
}
export function Stack({
  children,
  direction = "column",
  gap = 16,
}: {
  children: ReactNode;
  direction?: "row" | "column";
  gap?: number;
}) {
  return (
    <div className="gc-stack" style={{ flexDirection: direction, gap }}>
      {children}
    </div>
  );
}
export function Grid({
  children,
  minWidth = 180,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <div
      className="gc-grid"
      style={{
        gridTemplateColumns: `repeat(auto-fit,minmax(min(100%, ${minWidth}px),1fr))`,
      }}
    >
      {children}
    </div>
  );
}
export function Divider() {
  return <hr className="gc-divider" />;
}
