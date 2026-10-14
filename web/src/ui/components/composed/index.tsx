import {
  useEffect,
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Dialog, Select } from "../overlays";
import { Button, Pagination, TextField, Progress } from "../basic";

export function FormField({
  label,
  description,
  error,
  isRequired,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  isRequired?: boolean;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid": boolean;
    required: boolean;
  }) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="gc-form-field">
      <label htmlFor={id}>
        {label}
        {isRequired && <span aria-hidden="true"> *</span>}
      </label>
      {children({
        id,
        "aria-describedby": description || error ? `${id}-help` : undefined,
        "aria-invalid": !!error,
        required: !!isRequired,
      })}
      {(description || error) && (
        <p id={`${id}-help`} className={error ? "gc-error" : "gc-muted"}>
          {error || description}
        </p>
      )}
    </div>
  );
}
export function FormActions({
  isSubmitting,
  onCancel,
  error,
  submitLabel = "저장",
}: {
  isSubmitting: boolean;
  onCancel: () => void;
  error?: string;
  submitLabel?: string;
}) {
  return (
    <div className="gc-form-actions">
      {error && (
        <p role="alert" className="gc-error">
          {error}
        </p>
      )}
      <div className="gc-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "저장 중…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel = "삭제",
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  onConfirm: () => Promise<void>;
  confirmLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const isPendingRef = useRef(false);
  async function confirm() {
    if (isPendingRef.current) return;
    isPendingRef.current = true;
    setIsPending(true);
    setError("");
    try {
      await onConfirm();
      setIsOpen(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "요청에 실패했습니다. 다시 시도하세요.",
      );
    } finally {
      isPendingRef.current = false;
      setIsPending(false);
    }
  }
  return (
    <Dialog
      trigger={trigger}
      title={title}
      description={description}
      isOpen={isOpen}
      onOpenChange={(next) => {
        if (!isPendingRef.current) {
          setIsOpen(next);
          if (next) setError("");
        }
      }}
      shouldCloseOnOutsideClick={false}
      initialFocusRef={cancelRef}
      footer={
        <div className="gc-actions">
          <Button
            ref={cancelRef}
            variant="secondary"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button variant="danger" onClick={confirm} disabled={isPending}>
            {isPending ? "처리 중…" : confirmLabel}
          </Button>
        </div>
      }
    >
      {error && (
        <p role="alert" className="gc-error">
          {error}
        </p>
      )}
    </Dialog>
  );
}
export type FilterValues = { query: string; status: string };
export function SearchFilterBar({
  value,
  onApply,
  statusOptions = [
    { value: "all", label: "전체" },
    { value: "active", label: "활성" },
    { value: "draft", label: "초안" },
  ],
}: {
  value: FilterValues;
  onApply: (value: FilterValues) => void;
  statusOptions?: { value: string; label: string }[];
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value.query, value.status]);
  return (
    <div>
      <form
        className="gc-filter-bar"
        onSubmit={(e) => {
          e.preventDefault();
          onApply(draft);
        }}
      >
        <TextField
          label="검색"
          value={draft.query}
          onChange={(e) => setDraft({ ...draft, query: e.target.value })}
          placeholder="검색어 입력"
        />
        <Select
          label="상태"
          value={draft.status}
          onValueChange={(status) => setDraft({ ...draft, status })}
          options={statusOptions}
        />
        <Button variant="primary" type="submit">
          적용
        </Button>
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            const empty = { query: "", status: statusOptions[0]?.value || "" };
            setDraft(empty);
            onApply(empty);
          }}
        >
          초기화
        </Button>
      </form>
      <p className="gc-muted">
        적용된 조건: {value.query || "검색어 없음"} ·{" "}
        {statusOptions.find((option) => option.value === value.status)?.label ||
          value.status}
      </p>
    </div>
  );
}
export function AsyncContent({
  isLoading,
  isRefreshing = false,
  error,
  isEmpty,
  onRetry,
  children,
}: {
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: string;
  isEmpty: boolean;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (isLoading)
    return (
      <div className="gc-async" role="status" aria-label="처음 불러오는 중">
        <div className="gc-c-skeleton" />
        <div className="gc-c-skeleton" />
        <p>불러오는 중…</p>
      </div>
    );
  if (error && isEmpty)
    return (
      <div className="gc-async" role="alert">
        <p className="gc-error">{error}</p>
        <Button variant="secondary" onClick={onRetry}>
          다시 시도
        </Button>
      </div>
    );
  if (isEmpty)
    return (
      <div className="gc-async">
        <strong>표시할 항목이 없습니다</strong>
        <p className="gc-muted">조건을 바꾸거나 항목을 추가해보세요.</p>
      </div>
    );
  return (
    <div aria-busy={isRefreshing}>
      {isRefreshing && <p role="status">최신 내용을 불러오는 중…</p>}
      {error && (
        <div role="alert">
          <p className="gc-error">{error} 기존 내용을 유지합니다.</p>
          <Button variant="secondary" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      )}
      {children}
    </div>
  );
}
export type DataRow = { id: string; name: string; status: string };
export type DataColumn<T> = {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
  compare?: (a: T, b: T) => number;
};
export function DataTable<T = DataRow>({
  rows,
  columns,
  getRowId,
  caption = "데이터 목록",
  isSortable = true,
  isSelectable = true,
  isLoading,
  isRefreshing,
  error,
  onRetry,
  pageSize = 3,
}: {
  rows: T[];
  columns?: DataColumn<T>[];
  getRowId?: (row: T) => string;
  caption?: string;
  isSortable?: boolean;
  isSelectable?: boolean;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: string;
  onRetry: () => void;
  pageSize?: number;
}) {
  const activeColumns: DataColumn<T>[] = columns || [
    {
      id: "name",
      label: "이름",
      render: (row) => (row as DataRow).name,
      compare: (a, b) =>
        (a as DataRow).name.localeCompare((b as DataRow).name, "ko"),
    },
    { id: "status", label: "상태", render: (row) => (row as DataRow).status },
  ];
  const rowId = getRowId || ((row: T) => (row as DataRow).id);
  const [page, setPage] = useState(1);
  const [sortId, setSortId] = useState(
    activeColumns.find((column) => column.compare)?.id || "",
  );
  const [isAscending, setIsAscending] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / safePageSize));
  const safePage = Math.min(page, totalPages);
  const comparator = isSortable
    ? activeColumns.find((column) => column.id === sortId)?.compare
    : undefined;
  const sortedRows = comparator
    ? [...rows].sort((a, b) => (isAscending ? 1 : -1) * comparator(a, b))
    : rows;
  const visibleRows = sortedRows.slice(
    (safePage - 1) * safePageSize,
    safePage * safePageSize,
  );
  const hasAllSelected =
    visibleRows.length > 0 &&
    visibleRows.every((row) => selectedIds.includes(rowId(row)));
  const hasSomeSelected = visibleRows.some((row) =>
    selectedIds.includes(rowId(row)),
  );
  const allRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (allRef.current)
      allRef.current.indeterminate = hasSomeSelected && !hasAllSelected;
  }, [hasSomeSelected, hasAllSelected]);
  useEffect(() => {
    setPage(1);
    setSelectedIds([]);
  }, [rows]);
  function move(next: number) {
    setPage(next);
    setSelectedIds([]);
  }
  return (
    <AsyncContent
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      error={error}
      isEmpty={!rows.length}
      onRetry={onRetry}
    >
      <div
        className="gc-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={`${caption} 표 스크롤`}
      >
        <table className="gc-c-table">
          <caption>
            {caption}
            {isSelectable && ` · 현재 페이지에서 ${selectedIds.length}개 선택`}
          </caption>
          <thead>
            <tr>
              {isSelectable && (
                <th scope="col">
                  <input
                    ref={allRef}
                    type="checkbox"
                    className="gc-checkbox-input"
                    aria-label="현재 페이지 전체 선택"
                    checked={hasAllSelected}
                    onChange={(e) =>
                      setSelectedIds(
                        e.target.checked ? visibleRows.map(rowId) : [],
                      )
                    }
                  />
                </th>
              )}
              {activeColumns.map((column) => (
                <th
                  scope="col"
                  key={column.id}
                  aria-sort={
                    sortId === column.id && isSortable
                      ? isAscending
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {column.compare && isSortable ? (
                    <Button
                      variant="secondary"
                      className="gc-c-sort"
                      onClick={() => {
                        setIsAscending(
                          sortId === column.id ? !isAscending : true,
                        );
                        setSortId(column.id);
                        setPage(1);
                        setSelectedIds([]);
                      }}
                    >
                      {column.label}{" "}
                      {sortId === column.id ? (isAscending ? "↑" : "↓") : "↕"}
                    </Button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr key={rowId(row)}>
                {isSelectable && (
                  <td>
                    <input
                      type="checkbox"
                      className="gc-checkbox-input"
                      aria-label={`${rowId(row)} 행 선택`}
                      checked={selectedIds.includes(rowId(row))}
                      onChange={(e) =>
                        setSelectedIds(
                          e.target.checked
                            ? [...selectedIds, rowId(row)]
                            : selectedIds.filter((id) => id !== rowId(row)),
                        )
                      }
                    />
                  </td>
                )}
                {activeColumns.map((column) => (
                  <td key={column.id}>{column.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={safePage}
        totalPages={totalPages}
        onPageChange={move}
        isLoading={isRefreshing}
      />
    </AsyncContent>
  );
}
export type UploadItem = {
  id: string;
  file: File;
  state: "selected" | "uploading" | "success" | "error";
  progress: number;
  error?: string;
};
export type UploadAdapter = (
  file: File,
  options: { signal: AbortSignal; onProgress: (percent: number) => void },
) => Promise<void>;
export function FileUploader({
  onUpload,
  maxFiles = 3,
  maxBytes = 2 * 1024 * 1024,
  acceptedTypes = ["image/png", "image/jpeg", "image/svg+xml"],
}: {
  onUpload: UploadAdapter;
  maxFiles?: number;
  maxBytes?: number;
  acceptedTypes?: string[];
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const controllers = useRef(new Map<string, AbortController>());
  const isMounted = useRef(true);
  const countRef = useRef(0);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      controllers.current.forEach((controller) => controller.abort());
    };
  }, []);
  function add(files: FileList | File[]) {
    const added: UploadItem[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      if (countRef.current + added.length >= maxFiles) {
        errors.push(`최대 ${maxFiles}개까지 선택할 수 있습니다.`);
        break;
      }
      if (!acceptedTypes.includes(file.type)) {
        errors.push(`${file.name}: 지원하지 않는 파일 형식`);
        continue;
      }
      if (file.size > maxBytes) {
        errors.push(`${file.name}: 파일 크기 제한 초과`);
        continue;
      }
      added.push({
        id: crypto.randomUUID(),
        file,
        state: "selected",
        progress: 0,
      });
    }
    countRef.current += added.length;
    setItems((current) => [...current, ...added]);
    setError(errors.join(" · "));
  }
  async function upload(item: UploadItem) {
    if (controllers.current.has(item.id)) return;
    const controller = new AbortController();
    controllers.current.set(item.id, controller);
    function update(patch: Partial<UploadItem>) {
      if (isMounted.current)
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, ...patch } : entry,
          ),
        );
    }
    update({ state: "uploading", progress: 0, error: undefined });
    try {
      await onUpload(item.file, {
        signal: controller.signal,
        onProgress: (percent) =>
          update({ progress: Math.min(100, Math.max(0, percent)) }),
      });
      if (!controller.signal.aborted)
        update({ state: "success", progress: 100 });
    } catch (e) {
      if (!controller.signal.aborted)
        update({
          state: "error",
          error: e instanceof Error ? e.message : "업로드 실패",
        });
    } finally {
      controllers.current.delete(item.id);
    }
  }
  return (
    <div>
      <label
        className={`gc-dropzone ${isDragging ? "is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          add(e.dataTransfer.files);
        }}
      >
        <strong>파일을 놓거나 클릭해서 선택</strong>
        <span className="gc-muted">
          최대 {maxFiles}개 · 파일당 {Math.round(maxBytes / 1024 / 1024)}MB ·{" "}
          {acceptedTypes.join(", ")}
        </span>
        <input
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={(e) => {
            if (e.target.files) add(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p role="alert" className="gc-error">
          {error}
        </p>
      )}
      <ul className="gc-upload-list">
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.file.name}</strong>
              <p role="status">
                {item.state === "selected"
                  ? "선택됨 · 아직 업로드하지 않음"
                  : item.state === "success"
                    ? "업로드 완료"
                    : item.state === "error"
                      ? item.error
                      : `업로드 중 ${Math.round(item.progress)}%`}
              </p>
              {item.state === "uploading" && (
                <Progress
                  label={`${item.file.name} 업로드 진행률`}
                  value={item.progress}
                  size="thin"
                />
              )}
            </div>
            <div className="gc-actions">
              {item.state === "error" && (
                <Button variant="secondary" onClick={() => upload(item)}>
                  재시도
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => {
                  controllers.current.get(item.id)?.abort();
                  controllers.current.delete(item.id);
                  countRef.current--;
                  setItems((current) =>
                    current.filter((entry) => entry.id !== item.id),
                  );
                }}
              >
                제거
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Button
        variant="primary"
        disabled={!items.some((item) => item.state === "selected")}
        onClick={() =>
          items
            .filter((item) => item.state === "selected")
            .forEach((item) => {
              void upload(item);
            })
        }
      >
        선택한 파일 업로드
      </Button>
    </div>
  );
}
export type ViewerImage = { id: string; src: string; alt: string };
export function ImageViewer({
  images,
  index,
  isOpen,
  onOpenChange,
  onIndexChange,
  trigger,
  isAnimated = true,
}: {
  images: ViewerImage[];
  index: number;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onIndexChange: (index: number) => void;
  trigger?: ReactNode;
  isAnimated?: boolean;
}) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [state, setState] = useState<"loading" | "success" | "error" | "empty">(
    "loading",
  );
  const [retry, setRetry] = useState(0);
  const zoomRef = useRef(zoom);
  const positionRef = useRef(position);
  zoomRef.current = zoom;
  positionRef.current = position;
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const hasPinchedRef = useRef(false);
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
    anchorX: number;
    anchorY: number;
  } | null>(null);
  const [hasReducedMotion, setHasReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const shouldAnimate = isAnimated && !hasReducedMotion;
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const filmstripRef = useRef<HTMLDivElement>(null);
  const settleRef = useRef<Animation | null>(null);
  const offsetRef = useRef(0);
  const current = images[index];
  const lastTapRef = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );
  const gestureRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    startedAt: number;
    canSwipe: boolean;
    hasImageOrigin: boolean;
    hasMoved: boolean;
    isHorizontal: boolean | null;
  } | null>(null);
  const blankRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    canClose: boolean;
    hasMoved: boolean;
  } | null>(null);
  const canCloseOnClickRef = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setHasReducedMotion(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  useLayoutEffect(() => {
    settleRef.current?.cancel();
    settleRef.current = null;
    offsetRef.current = 0;
    if (trackRef.current) trackRef.current.style.transform = "translateX(0px)";
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setState(current ? "loading" : "empty");
    gestureRef.current = null;
    lastTapRef.current = null;
    pointersRef.current.clear();
    pinchRef.current = null;
    hasPinchedRef.current = false;
    zoomRef.current = 1;
    positionRef.current = { x: 0, y: 0 };
  }, [current?.src, current?.id, index, isOpen]);
  useEffect(
    () => () => {
      settleRef.current?.cancel();
    },
    [],
  );
  useEffect(() => {
    if (!isOpen || !current) return;
    const image = imageRef.current;
    if (image?.complete) setState(image.naturalWidth > 0 ? "success" : "error");
  }, [current?.src, current?.id, index, isOpen, retry]);
  useEffect(() => {
    if (isOpen)
      filmstripRef.current
        ?.querySelector<HTMLElement>('[aria-current="true"]')
        ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [index, isOpen]);
  function clamp(x: number, y: number, nextZoom = zoom) {
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image) return { x: 0, y: 0 };
    const maxX = Math.max(
      0,
      (image.offsetWidth * nextZoom - viewport.clientWidth) / 2,
    );
    const maxY = Math.max(
      0,
      (image.offsetHeight * nextZoom - viewport.clientHeight) / 2,
    );
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }
  function applyView(nextZoom: number, nextPosition: { x: number; y: number }) {
    zoomRef.current = nextZoom;
    positionRef.current = nextPosition;
    setZoom(nextZoom);
    setPosition(nextPosition);
  }
  function beginPinch() {
    const points = [...pointersRef.current.values()];
    const viewport = viewportRef.current;
    if (points.length < 2 || !viewport) return;
    settleRef.current?.cancel();
    settleRef.current = null;
    writeOffset(0);
    gestureRef.current = null;
    hasPinchedRef.current = true;
    lastTapRef.current = null;
    canCloseOnClickRef.current = false;
    blankRef.current = null;
    const [first, second] = points;
    const rect = viewport.getBoundingClientRect();
    const midX = (first.x + second.x) / 2 - (rect.left + rect.width / 2);
    const midY = (first.y + second.y) / 2 - (rect.top + rect.height / 2);
    pinchRef.current = {
      distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
      zoom: zoomRef.current,
      anchorX: (midX - positionRef.current.x) / zoomRef.current,
      anchorY: (midY - positionRef.current.y) / zoomRef.current,
    };
  }
  function movePinch() {
    const pinch = pinchRef.current;
    const points = [...pointersRef.current.values()];
    const viewport = viewportRef.current;
    if (!pinch || points.length < 2 || !viewport) return;
    const [first, second] = points;
    const rect = viewport.getBoundingClientRect();
    const nextZoom = Math.max(
      1,
      Math.min(
        4,
        (pinch.zoom * Math.hypot(first.x - second.x, first.y - second.y)) /
          pinch.distance,
      ),
    );
    const midX = (first.x + second.x) / 2 - (rect.left + rect.width / 2);
    const midY = (first.y + second.y) / 2 - (rect.top + rect.height / 2);
    applyView(
      nextZoom,
      clamp(
        midX - pinch.anchorX * nextZoom,
        midY - pinch.anchorY * nextZoom,
        nextZoom,
      ),
    );
  }
  function handleImageTap(event: React.PointerEvent<HTMLDivElement>) {
    const gesture = gestureRef.current;
    const now = performance.now();
    if (
      !gesture ||
      !gesture.hasImageOrigin ||
      gesture.hasMoved ||
      now - gesture.startedAt > 250 ||
      !["touch", "pen"].includes(event.pointerType)
    ) {
      lastTapRef.current = null;
      return;
    }
    const previous = lastTapRef.current;
    if (
      previous &&
      now - previous.time <= 300 &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <= 32
    ) {
      lastTapRef.current = null;
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const x = event.clientX - (rect.left + rect.width / 2),
        y = event.clientY - (rect.top + rect.height / 2);
      const oldZoom = zoomRef.current;
      const anchorX = (x - positionRef.current.x) / oldZoom,
        anchorY = (y - positionRef.current.y) / oldZoom;
      const nextZoom = oldZoom > 1 ? 1 : 2;
      changeZoom(nextZoom);
      applyView(
        nextZoom,
        nextZoom === 1
          ? { x: 0, y: 0 }
          : clamp(x - anchorX * nextZoom, y - anchorY * nextZoom, nextZoom),
      );
      gestureRef.current = null;
    } else
      lastTapRef.current = { x: event.clientX, y: event.clientY, time: now };
  }
  function finishPointer(
    event: React.PointerEvent<HTMLDivElement>,
    isCanceled = false,
  ) {
    if (
      !pointersRef.current.has(event.pointerId) &&
      gestureRef.current?.pointerId !== event.pointerId
    )
      return;
    const hasPinched = hasPinchedRef.current;
    pointersRef.current.delete(event.pointerId);
    if (hasPinched) {
      canCloseOnClickRef.current = false;
      if (event.currentTarget.hasPointerCapture(event.pointerId))
        event.currentTarget.releasePointerCapture(event.pointerId);
      pinchRef.current = null;
      if (pointersRef.current.size >= 2) beginPinch();
      else if (pointersRef.current.size === 1) {
        const [pointerId, point] = [...pointersRef.current.entries()][0];
        gestureRef.current = {
          pointerId,
          x: point.x,
          y: point.y,
          startX: positionRef.current.x,
          startY: positionRef.current.y,
          startedAt: performance.now(),
          canSwipe: false,
          hasImageOrigin: false,
          hasMoved: true,
          isHorizontal: null,
        };
      } else {
        gestureRef.current = null;
        hasPinchedRef.current = false;
      }
      return;
    }
    if (isCanceled) lastTapRef.current = null;
    else handleImageTap(event);
    endGesture(event, isCanceled);
  }
  function changeZoom(next: number) {
    settleRef.current?.cancel();
    settleRef.current = null;
    offsetRef.current = 0;
    if (trackRef.current) trackRef.current.style.transform = "translateX(0px)";
    gestureRef.current = null;
    lastTapRef.current = null;
    pointersRef.current.clear();
    pinchRef.current = null;
    hasPinchedRef.current = false;
    const bounded = Math.max(1, Math.min(4, next));
    applyView(
      bounded,
      clamp(positionRef.current.x, positionRef.current.y, bounded),
    );
  }
  useEffect(() => {
    if (!isOpen) return;
    const observer = new ResizeObserver(() =>
      setPosition((point) => clamp(point.x, point.y)),
    );
    if (viewportRef.current) observer.observe(viewportRef.current);
    return () => observer.disconnect();
  }, [zoom, isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    function navigate(event: KeyboardEvent) {
      if (
        event.shiftKey &&
        zoom > 1 &&
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
      ) {
        event.preventDefault();
        setPosition((point) =>
          clamp(
            point.x +
              (event.key === "ArrowLeft"
                ? 40
                : event.key === "ArrowRight"
                  ? -40
                  : 0),
            point.y +
              (event.key === "ArrowUp"
                ? 40
                : event.key === "ArrowDown"
                  ? -40
                  : 0),
          ),
        );
        return;
      }
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        onIndexChange(index - 1);
      }
      if (event.key === "ArrowRight" && index < images.length - 1) {
        event.preventDefault();
        onIndexChange(index + 1);
      }
    }
    document.addEventListener("keydown", navigate);
    return () => document.removeEventListener("keydown", navigate);
  }, [isOpen, index, images.length, onIndexChange, zoom]);
  function isBlank(target: EventTarget | null) {
    return (
      target instanceof HTMLElement && target.hasAttribute("data-viewer-blank")
    );
  }
  function writeOffset(offset: number) {
    offsetRef.current = offset;
    if (trackRef.current)
      trackRef.current.style.transform = `translateX(${offset}px)`;
  }
  function settleGesture(nextIndex: number) {
    const track = trackRef.current;
    const width = viewportRef.current?.clientWidth || 0;
    const hasCommitted = nextIndex !== index;
    const target = hasCommitted ? (nextIndex > index ? -width : width) : 0;
    const finish = () => {
      if (hasCommitted) onIndexChange(nextIndex);
      else writeOffset(0);
    };
    if (!track || !shouldAnimate || Math.abs(target - offsetRef.current) < 1) {
      finish();
      return;
    }
    const animation = track.animate(
      [
        { transform: `translateX(${offsetRef.current}px)` },
        { transform: `translateX(${target}px)` },
      ],
      { duration: 180, easing: "cubic-bezier(.2,.7,.2,1)", fill: "forwards" },
    );
    settleRef.current = animation;
    animation.finished
      .then(() => {
        if (settleRef.current !== animation) return;
        settleRef.current = null;
        writeOffset(target);
        animation.cancel();
        finish();
      })
      .catch(() => {});
  }
  function endGesture(
    event: React.PointerEvent<HTMLDivElement>,
    isCanceled = false,
  ) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
    if (zoomRef.current > 1 || !gesture.canSwipe) return;
    const offset = offsetRef.current;
    const width = viewportRef.current?.clientWidth || 0;
    const elapsed = Math.max(1, performance.now() - gesture.startedAt);
    const hasEnoughDistance = Math.abs(offset) >= Math.min(96, width * 0.22);
    const hasFlick = Math.abs(offset) > 32 && Math.abs(offset) / elapsed > 0.55;
    const canCommit =
      !isCanceled && gesture.isHorizontal && (hasEnoughDistance || hasFlick);
    const nextIndex =
      canCommit && offset < 0 && index < images.length - 1
        ? index + 1
        : canCommit && offset > 0 && index > 0
          ? index - 1
          : index;
    settleGesture(nextIndex);
  }
  return (
    <Dialog
      trigger={trigger}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="이미지 보기"
      description={current?.alt || "이미지 없음"}
      initialFocusRef={closeRef}
      className="gc-viewer-dialog"
    >
      <div
        className="gc-viewer"
        data-animated={shouldAnimate}
        data-viewer-blank
        onPointerDownCapture={(event) => {
          canCloseOnClickRef.current = false;
          if (event.target !== imageRef.current) lastTapRef.current = null;
          blankRef.current = {
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            canClose:
              isBlank(event.target) &&
              pointersRef.current.size === 0 &&
              !hasPinchedRef.current,
            hasMoved: false,
          };
        }}
        onPointerMoveCapture={(event) => {
          const blank = blankRef.current;
          if (
            blank &&
            blank.pointerId === event.pointerId &&
            Math.abs(event.clientX - blank.x) +
              Math.abs(event.clientY - blank.y) >
              5
          )
            blank.hasMoved = true;
        }}
        onPointerUpCapture={(event) => {
          const blank = blankRef.current;
          const hit = document.elementFromPoint(event.clientX, event.clientY);
          canCloseOnClickRef.current =
            !!blank &&
            blank.pointerId === event.pointerId &&
            blank.canClose &&
            !blank.hasMoved &&
            !hasPinchedRef.current &&
            isBlank(hit);
          blankRef.current = null;
        }}
        onPointerCancelCapture={() => {
          blankRef.current = null;
          canCloseOnClickRef.current = false;
        }}
        onClick={(event) => {
          if (event.detail > 0 && canCloseOnClickRef.current) {
            canCloseOnClickRef.current = false;
            onOpenChange(false);
          } else canCloseOnClickRef.current = false;
        }}
      >
        <div className="gc-viewer-toolbar">
          <span className="gc-viewer-counter" aria-live="polite">
            {current ? index + 1 : 0} / {images.length}
          </span>
          <div className="gc-viewer-tools">
            <Button
              variant="secondary"
              disabled={zoom <= 1 || state !== "success"}
              aria-label="축소"
              onClick={() => changeZoom(zoom - 0.5)}
            >
              −
            </Button>
            <span className="gc-viewer-zoom">{Math.round(zoom * 100)}%</span>
            <Button
              variant="secondary"
              disabled={zoom >= 4 || state !== "success"}
              aria-label="확대"
              onClick={() => changeZoom(zoom + 0.5)}
            >
              +
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                changeZoom(1);
                setPosition({ x: 0, y: 0 });
              }}
            >
              초기화
            </Button>
            <span className="gc-viewer-toolbar-divider" />
            <Button
              ref={closeRef}
              variant="secondary"
              className="gc-viewer-close"
              aria-label="닫기"
              onClick={() => onOpenChange(false)}
            >
              ×
            </Button>
          </div>
        </div>
        <div
          ref={viewportRef}
          className="gc-viewer-viewport"
          data-viewer-blank
          style={{ touchAction: "none", cursor: zoom > 1 ? "grab" : "default" }}
          onPointerDown={(event) => {
            if (
              (event.target as HTMLElement).closest("button") ||
              state !== "success"
            )
              return;
            if (settleRef.current) {
              settleRef.current.cancel();
              settleRef.current = null;
              writeOffset(0);
            }
            const isTouch =
              event.pointerType === "touch" || event.pointerType === "pen";
            if (isTouch) {
              if (pointersRef.current.size === 0) hasPinchedRef.current = false;
              pointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
              });
              event.currentTarget.setPointerCapture(event.pointerId);
              if (pointersRef.current.size >= 2) {
                beginPinch();
                return;
              }
            }
            const canSwipe =
              zoomRef.current === 1 &&
              (event.target === imageRef.current || isBlank(event.target)) &&
              isTouch;
            gestureRef.current = {
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
              startX: positionRef.current.x,
              startY: positionRef.current.y,
              startedAt: performance.now(),
              canSwipe,
              hasImageOrigin: event.target === imageRef.current,
              hasMoved: false,
              isHorizontal: null,
            };
            if (zoomRef.current > 1 || canSwipe)
              event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (pointersRef.current.has(event.pointerId))
              pointersRef.current.set(event.pointerId, {
                x: event.clientX,
                y: event.clientY,
              });
            if (pinchRef.current && pointersRef.current.size >= 2) {
              movePinch();
              return;
            }
            const gesture = gestureRef.current;
            if (!gesture || gesture.pointerId !== event.pointerId) return;
            const dx = event.clientX - gesture.x;
            const dy = event.clientY - gesture.y;
            if (Math.hypot(dx, dy) > 8) {
              gesture.hasMoved = true;
              lastTapRef.current = null;
            }
            if (zoomRef.current > 1 || hasPinchedRef.current) {
              applyView(
                zoomRef.current,
                clamp(
                  gesture.startX + dx,
                  gesture.startY + dy,
                  zoomRef.current,
                ),
              );
              return;
            }
            if (!gesture.canSwipe) return;
            if (
              gesture.isHorizontal === null &&
              Math.abs(dx) + Math.abs(dy) > 8
            )
              gesture.isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.15;
            if (!gesture.isHorizontal) return;
            const hasNeighbor = dx < 0 ? index < images.length - 1 : index > 0;
            writeOffset(hasNeighbor ? dx : dx * 0.22);
          }}
          onPointerUp={(event) => finishPointer(event)}
          onPointerCancel={(event) => finishPointer(event, true)}
          onLostPointerCapture={(event) => finishPointer(event, true)}
        >
          {state === "empty" && (
            <p className="gc-viewer-message" role="status">
              표시할 이미지가 없습니다.
            </p>
          )}
          {state === "loading" && (
            <p className="gc-viewer-message" role="status">
              이미지를 불러오는 중…
            </p>
          )}
          {state === "error" && (
            <div className="gc-viewer-message" role="alert">
              <p>이미지를 불러오지 못했습니다.</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setState("loading");
                  setRetry(retry + 1);
                }}
              >
                다시 시도
              </Button>
            </div>
          )}
          <div
            ref={trackRef}
            className="gc-viewer-swipe-track"
            data-viewer-blank
          >
            {images[index - 1] && (
              <div
                className="gc-viewer-image-layer gc-viewer-page-previous"
                aria-hidden="true"
              >
                <img src={images[index - 1].src} alt="" draggable={false} />
              </div>
            )}
            {current && (
              <div
                key={`${current.id}-${index}-${current.src}-${retry}`}
                className="gc-viewer-image-layer gc-viewer-image-current"
                data-viewer-blank
                data-page-index={index}
              >
                <img
                  ref={imageRef}
                  src={current.src}
                  alt={current.alt}
                  draggable={false}
                  onLoad={() => setState("success")}
                  onError={() => setState("error")}
                  style={{
                    visibility: state === "success" ? "visible" : "hidden",
                    transform: `translate(${position.x}px,${position.y}px) scale(${zoom})`,
                  }}
                />
              </div>
            )}
            {images[index + 1] && (
              <div
                className="gc-viewer-image-layer gc-viewer-page-next"
                aria-hidden="true"
              >
                <img src={images[index + 1].src} alt="" draggable={false} />
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            className="gc-viewer-nav gc-viewer-nav-previous"
            aria-label="← 이전"
            disabled={index <= 0 || !current}
            onClick={() => onIndexChange(index - 1)}
          >
            ‹
          </Button>
          <Button
            variant="secondary"
            className="gc-viewer-nav gc-viewer-nav-next"
            aria-label="다음 →"
            disabled={!current || index >= images.length - 1}
            onClick={() => onIndexChange(index + 1)}
          >
            ›
          </Button>
        </div>
        <div className="gc-viewer-caption" data-viewer-blank>
          <p>{current?.alt || "이미지 없음"}</p>
        </div>
        <div
          ref={filmstripRef}
          className="gc-viewer-filmstrip"
          aria-label="이미지 썸네일 목록"
          data-viewer-blank
        >
          {images.map((image, imageIndex) => (
            <Button
              key={`${image.id}-${imageIndex}`}
              variant="secondary"
              className="gc-viewer-thumbnail"
              aria-label={`${imageIndex + 1}번 이미지: ${image.alt}`}
              aria-current={imageIndex === index ? "true" : undefined}
              onClick={() => onIndexChange(imageIndex)}
            >
              <GalleryImage item={image} />
            </Button>
          ))}
        </div>
        <p className="gc-viewer-hint">
          이미지 두 번 탭으로 확대·초기화 · 두 손가락으로 확대·축소 · 좌우
          스와이프 · 빈 공간이나 Escape로 닫기
        </p>
      </div>
    </Dialog>
  );
}
export function ImageGallery({ images }: { images: ViewerImage[] }) {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <div>
      <div className="gc-image-gallery">
        {images.map((item, imageIndex) => (
          <Button
            className="gc-gallery-item"
            key={item.id}
            onClick={(e) => {
              triggerRef.current = e.currentTarget;
              setIndex(imageIndex);
              setIsOpen(true);
            }}
          >
            <GalleryImage item={item} />
            <span>{item.alt}</span>
          </Button>
        ))}
      </div>
      <ImageViewer
        images={images}
        index={index}
        onIndexChange={setIndex}
        isOpen={isOpen}
        onOpenChange={(next) => {
          setIsOpen(next);
          if (!next) requestAnimationFrame(() => triggerRef.current?.focus());
        }}
      />
    </div>
  );
}
function GalleryImage({ item }: { item: ViewerImage }) {
  const [hasError, setHasError] = useState(false);
  useEffect(() => setHasError(false), [item.src]);
  return hasError ? (
    <span className="gc-gallery-fallback">이미지 없음</span>
  ) : (
    <img src={item.src} alt="" onError={() => setHasError(true)} />
  );
}
export function CopyField({ value, label }: { value: string; label: string }) {
  const [message, setMessage] = useState("");
  const [isCopying, setIsCopying] = useState(false);
  const isCopyingRef = useRef(false);
  async function copy() {
    if (isCopyingRef.current) return;
    isCopyingRef.current = true;
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(value);
      setMessage("복사했습니다.");
    } catch {
      setMessage("복사하지 못했습니다. 텍스트를 직접 선택해 복사하세요.");
    } finally {
      isCopyingRef.current = false;
      setIsCopying(false);
    }
  }
  return (
    <div className="gc-copy-field">
      <TextField label={label} value={value} readOnly />
      <Button variant="secondary" onClick={copy} disabled={isCopying}>
        {isCopying ? "복사 중…" : "복사"}
      </Button>
      <p role="status">{message}</p>
    </div>
  );
}
