import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Tabs as RadixTabs } from "radix-ui";

export type TabsItem = {
  value: string;
  label: string;
  content: ReactNode;
  icon?: ReactNode;
  badge?: number;
  isDisabled?: boolean;
};
export type TabItem = TabsItem;
export type TabsVariant = "underline" | "adaptive" | "segmented" | "bottom";
export type TabsProps = {
  items: TabsItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: TabsVariant;
  label?: string;
};

function TabTrigger({
  item,
  isActive,
  variant,
}: {
  item: TabsItem;
  isActive: boolean;
  variant: NonNullable<TabsProps["variant"]>;
}) {
  const measureRef = useRef<HTMLSpanElement>(null);
  const [labelWidth, setLabelWidth] = useState(0);
  const isAdaptive = variant === "adaptive" && !!item.icon;
  useEffect(() => {
    const element = measureRef.current;
    if (!element) return;
    const measure = () =>
      setLabelWidth(Math.ceil(element.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    let isSubscribed = true;
    document.fonts.ready.then(() => {
      if (isSubscribed) measure();
    });
    return () => {
      isSubscribed = false;
      observer.disconnect();
    };
  }, [item.label, item.badge]);
  const badge =
    item.badge !== undefined ? (
      <span className="gc-tabs-badge" aria-hidden="true">
        {item.badge}
      </span>
    ) : null;
  return (
    <RadixTabs.Trigger
      value={item.value}
      disabled={item.isDisabled}
      aria-label={`${item.label}${item.badge !== undefined ? `, ${item.badge}개` : ""}`}
      className={`gc-tabs-trigger ${isAdaptive ? "gc-tabs-has-adaptive-icon" : ""}`}
      style={{ "--gc-tab-label-width": `${labelWidth}px` } as CSSProperties}
    >
      {item.icon && (
        <span className="gc-tabs-icon" aria-hidden="true">
          {item.icon}
        </span>
      )}
      <span
        className="gc-tabs-label"
        aria-hidden={isAdaptive && !isActive ? true : undefined}
      >
        <span>{item.label}</span>
        {badge}
      </span>
      {isAdaptive && (
        <span ref={measureRef} className="gc-tabs-measure" aria-hidden="true">
          <span>{item.label}</span>
          {badge}
        </span>
      )}
    </RadixTabs.Trigger>
  );
}

export function Tabs({
  items,
  defaultValue,
  value,
  onValueChange,
  variant = "underline",
  label = "콘텐츠 보기",
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? items.find((item) => !item.isDisabled)?.value ?? "",
  );
  const activeValue = value ?? internalValue;
  const triggerRefs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = triggerRefs.current;
    if (!root) return;
    const selected = root.querySelector<HTMLElement>('[data-state="active"]');
    if (!selected) return;
    const listRect = root.getBoundingClientRect();
    const selectedRect = selected.getBoundingClientRect();
    const clearance =
      parseFloat(
        getComputedStyle(root).getPropertyValue("--gc-focus-clearance"),
      ) || 6;
    if (selectedRect.left < listRect.left + clearance)
      root.scrollLeft -= listRect.left + clearance - selectedRect.left;
    if (selectedRect.right > listRect.right - clearance)
      root.scrollLeft += selectedRect.right - (listRect.right - clearance);
  }, [activeValue, variant]);
  return (
    <RadixTabs.Root
      className={`gc-tabs gc-tabs-${variant}`}
      value={activeValue}
      onValueChange={(next) => {
        setInternalValue(next);
        onValueChange?.(next);
      }}
      activationMode="manual"
    >
      <RadixTabs.List
        ref={triggerRefs}
        className="gc-tabs-list"
        aria-label={label}
        onTransitionEnd={(event) => {
          if (event.propertyName !== "width") return;
          const list = event.currentTarget;
          const target = list.querySelector<HTMLElement>(
            '[data-state="active"]',
          );
          if (!target) return;
          const viewport = list.getBoundingClientRect();
          const rect = target.getBoundingClientRect();
          const clearance =
            parseFloat(
              getComputedStyle(list).getPropertyValue("--gc-focus-clearance"),
            ) || 6;
          if (rect.left < viewport.left + clearance)
            list.scrollLeft -= viewport.left + clearance - rect.left;
          if (rect.right > viewport.right - clearance)
            list.scrollLeft += rect.right - (viewport.right - clearance);
        }}
        onFocusCapture={(event) => {
          const target = event.target as HTMLElement;
          const list = event.currentTarget;
          const listRect = list.getBoundingClientRect();
          const rect = target.getBoundingClientRect();
          const clearance =
            parseFloat(
              getComputedStyle(list).getPropertyValue("--gc-focus-clearance"),
            ) || 6;
          if (rect.left < listRect.left + clearance)
            list.scrollLeft -= listRect.left + clearance - rect.left;
          if (rect.right > listRect.right - clearance)
            list.scrollLeft += rect.right - (listRect.right - clearance);
        }}
      >
        {items.map((item) => (
          <TabTrigger
            key={item.value}
            item={item}
            isActive={item.value === activeValue}
            variant={variant}
          />
        ))}
      </RadixTabs.List>
      {items.map((item) => (
        <RadixTabs.Content
          key={item.value}
          className="gc-tabs-panel"
          value={item.value}
        >
          {item.content}
        </RadixTabs.Content>
      ))}
    </RadixTabs.Root>
  );
}
