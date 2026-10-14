import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Select as RSelect,
  DropdownMenu,
  Popover as RPopover,
  Tooltip as RTooltip,
  Dialog as RDialog,
  Accordion as RAccordion,
} from "radix-ui";
import { Check, ChevronDown, X } from "lucide-react";

export type Option = { value: string; label: string; isDisabled?: boolean };
export function Select({
  label,
  value,
  onValueChange,
  options,
  isDisabled = false,
  placeholder = "선택하세요",
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  isDisabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="gc-overlay-field">
      <label id={id}>{label}</label>
      <RSelect.Root
        value={value}
        onValueChange={onValueChange}
        disabled={isDisabled}
      >
        <RSelect.Trigger className="gc-select" aria-labelledby={id}>
          <RSelect.Value placeholder={placeholder} />
          <RSelect.Icon>
            <ChevronDown size={16} />
          </RSelect.Icon>
        </RSelect.Trigger>
        <RSelect.Portal>
          <RSelect.Content
            className="gc-floating gc-select-content"
            position="popper"
            sideOffset={6}
          >
            <RSelect.ScrollUpButton>↑</RSelect.ScrollUpButton>
            <RSelect.Viewport>
              {options.map((option) => (
                <RSelect.Item
                  className="gc-option"
                  key={option.value}
                  value={option.value}
                  disabled={option.isDisabled}
                >
                  <RSelect.ItemText>{option.label}</RSelect.ItemText>
                  <RSelect.ItemIndicator>
                    <Check size={15} />
                  </RSelect.ItemIndicator>
                </RSelect.Item>
              ))}
            </RSelect.Viewport>
            <RSelect.ScrollDownButton>↓</RSelect.ScrollDownButton>
          </RSelect.Content>
        </RSelect.Portal>
      </RSelect.Root>
    </div>
  );
}
export function Combobox({
  label,
  value,
  onValueChange,
  options,
  isLoading = false,
  isDisabled = false,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  isLoading?: boolean;
  isDisabled?: boolean;
}) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const isComposing = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen && !isLoading)
      document
        .getElementById(`${id}-option-${activeIndex}`)
        ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, id, isOpen, isLoading, query]);
  const selected = options.find((option) => option.value === value);
  const matches = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );
  const available = matches.filter((option) => !option.isDisabled);
  const choose = (option: Option) => {
    onValueChange(option.value);
    setIsOpen(false);
    setQuery("");
    inputRef.current?.focus();
  };
  return (
    <div className="gc-overlay-field">
      <label htmlFor={id}>{label}</label>
      <RPopover.Root
        open={isOpen}
        onOpenChange={(next) => {
          setIsOpen(next);
          if (!next) setQuery("");
        }}
      >
        <RPopover.Anchor asChild>
          <div className="gc-combobox-input">
            <input
              ref={inputRef}
              id={id}
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls={`${id}-list`}
              aria-activedescendant={
                isOpen && !isLoading && available[activeIndex]
                  ? `${id}-option-${activeIndex}`
                  : undefined
              }
              disabled={isDisabled}
              value={isOpen ? query : (selected?.label ?? "")}
              placeholder="검색해서 선택"
              onFocus={() => {
                setQuery("");
                setActiveIndex(0);
                setIsOpen(true);
              }}
              onClick={() => {
                if (!isOpen) {
                  setQuery("");
                  setActiveIndex(0);
                  setIsOpen(true);
                }
              }}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
                setIsOpen(true);
              }}
              onCompositionStart={() => {
                isComposing.current = true;
              }}
              onCompositionEnd={() => {
                isComposing.current = false;
              }}
              onKeyDown={(event) => {
                if (isComposing.current || event.nativeEvent.isComposing)
                  return;
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                  event.preventDefault();
                  setIsOpen(true);
                  setActiveIndex((index) =>
                    Math.max(
                      0,
                      Math.min(
                        available.length - 1,
                        index + (event.key === "ArrowDown" ? 1 : -1),
                      ),
                    ),
                  );
                }
                if (event.key === "Enter" && isOpen) {
                  event.preventDefault();
                  if (!isLoading && available[activeIndex])
                    choose(available[activeIndex]);
                }
                if (event.key === "Tab") {
                  setIsOpen(false);
                  setQuery("");
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  setIsOpen(false);
                  setQuery("");
                }
              }}
            />
            <ChevronDown size={16} />
          </div>
        </RPopover.Anchor>
        <RPopover.Portal>
          <RPopover.Content
            className="gc-floating gc-combobox-list"
            role="presentation"
            sideOffset={6}
            onInteractOutside={(event) => {
              if (event.target === inputRef.current) event.preventDefault();
            }}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <div
              id={`${id}-list`}
              role="listbox"
              aria-label={label}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <p role="status">목록을 불러오는 중…</p>
              ) : matches.length === 0 ? (
                <p role="status">검색 결과가 없습니다.</p>
              ) : (
                matches.map((option) => {
                  const index = available.indexOf(option);
                  return (
                    <div
                      key={option.value}
                      id={index >= 0 ? `${id}-option-${index}` : undefined}
                      role="option"
                      aria-selected={option.value === value}
                      aria-disabled={option.isDisabled}
                      className={`gc-option ${index === activeIndex ? "is-highlighted" : ""}`}
                      onPointerMove={() => {
                        if (index >= 0) setActiveIndex(index);
                      }}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => {
                        if (!option.isDisabled) choose(option);
                      }}
                    >
                      {option.label}
                      {option.value === value && <Check size={15} />}
                    </div>
                  );
                })
              )}
            </div>
          </RPopover.Content>
        </RPopover.Portal>
      </RPopover.Root>
    </div>
  );
}
export type MenuItem = {
  label: string;
  onSelect: () => void;
  isDisabled?: boolean;
  isDangerous?: boolean;
};
export function Menu({
  trigger,
  items,
}: {
  trigger: ReactNode;
  items: MenuItem[];
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="gc-floating" sideOffset={6}>
          {items.map((item, index) => (
            <DropdownMenu.Item
              key={index}
              className={`gc-option ${item.isDangerous ? "gc-danger" : ""}`}
              disabled={item.isDisabled}
              onSelect={item.onSelect}
            >
              {item.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
export function Popover({
  trigger,
  children,
  label,
}: {
  trigger: ReactNode;
  children: ReactNode;
  label: string;
}) {
  return (
    <RPopover.Root>
      <RPopover.Trigger asChild>{trigger}</RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content
          className="gc-floating gc-popover"
          sideOffset={8}
          aria-label={label}
        >
          <RPopover.Close className="gc-overlay-close" aria-label="닫기">
            <X size={16} />
          </RPopover.Close>
          {children}
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
export function Tooltip({
  children,
  content,
}: {
  children: ReactNode;
  content: string;
}) {
  return (
    <RTooltip.Provider delayDuration={350}>
      <RTooltip.Root>
        <RTooltip.Trigger asChild>{children}</RTooltip.Trigger>
        <RTooltip.Portal>
          <RTooltip.Content className="gc-tooltip" sideOffset={7}>
            {content}
            <RTooltip.Arrow />
          </RTooltip.Content>
        </RTooltip.Portal>
      </RTooltip.Root>
    </RTooltip.Provider>
  );
}
export type DialogProps = {
  trigger?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  shouldCloseOnOutsideClick?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
  shouldCloseOnEscape?: boolean;
};
function Modal({
  trigger,
  title,
  description,
  children,
  footer,
  shouldCloseOnOutsideClick = true,
  isOpen,
  onOpenChange,
  initialFocusRef,
  className,
  shouldCloseOnEscape = true,
  isDrawer = false,
}: DialogProps & { isDrawer?: boolean }) {
  return (
    <RDialog.Root open={isOpen} onOpenChange={onOpenChange}>
      {trigger && <RDialog.Trigger asChild>{trigger}</RDialog.Trigger>}
      <RDialog.Portal>
        <RDialog.Overlay className="gc-modal-overlay" />
        <RDialog.Content
          className={`gc-modal ${isDrawer ? "gc-drawer" : ""} ${className ?? ""}`}
          {...(!description ? { "aria-describedby": undefined } : {})}
          onOpenAutoFocus={(event) => {
            if (initialFocusRef?.current) {
              event.preventDefault();
              initialFocusRef.current.focus();
            }
          }}
          onEscapeKeyDown={(event) => {
            if (!shouldCloseOnEscape) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (!shouldCloseOnOutsideClick) event.preventDefault();
          }}
        >
          <header>
            <RDialog.Title>{title}</RDialog.Title>
            {description && (
              <RDialog.Description>{description}</RDialog.Description>
            )}
            <RDialog.Close className="gc-overlay-close" aria-label="닫기">
              <X size={20} />
            </RDialog.Close>
          </header>
          <div className="gc-modal-body">{children}</div>
          {footer && <footer>{footer}</footer>}
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
export function Dialog(props: DialogProps) {
  return <Modal {...props} />;
}
export function Drawer(props: DialogProps) {
  return <Modal {...props} isDrawer />;
}
export function DialogClose({ children }: { children: ReactNode }) {
  return <RDialog.Close asChild>{children}</RDialog.Close>;
}
export { Tabs } from "./tabs";
export type { TabsProps, TabItem, TabsVariant } from "./tabs";
export function Accordion({
  items,
}: {
  items: {
    value: string;
    title: string;
    content: ReactNode;
    isDisabled?: boolean;
  }[];
}) {
  return (
    <RAccordion.Root type="multiple" className="gc-accordion">
      {items.map((item) => (
        <RAccordion.Item
          key={item.value}
          value={item.value}
          disabled={item.isDisabled}
        >
          <RAccordion.Header>
            <RAccordion.Trigger>
              {item.title}
              <ChevronDown size={16} />
            </RAccordion.Trigger>
          </RAccordion.Header>
          <RAccordion.Content>
            <div>{item.content}</div>
          </RAccordion.Content>
        </RAccordion.Item>
      ))}
    </RAccordion.Root>
  );
}
export { ToastProvider, ToastPreview, useToast } from "./toast";
export type { ToastMessage, ToastLayout, ToastDirection } from "./toast";
