import { useState, useSyncExternalStore } from "react";
import { Menu } from "lucide-react";
import { Badge, Button, Drawer, ToastProvider } from "./ui/components";
import { AppProvider, statusOf, useApp, type NodeId, type Status } from "./state";
import { Live } from "./Live";
import { Hub, ReferencePanel, SourcePanel, TaskPanel } from "./panels";
import { Help } from "./Help";

export const NODES: { id: NodeId; label: string; desc: string; group: string }[] = [
  { id: "source", label: "소스", desc: "처리할 오디오와 처리 구간", group: "공통 자원" },
  { id: "reference", label: "참조", desc: "대상 목소리 구간 (같은 파일 또는 다른 파일)", group: "공통 자원" },
  { id: "extract", label: "추출", desc: "대상 화자의 목소리만 남깁니다", group: "작업" },
  { id: "remove", label: "제거", desc: "대상 화자의 목소리를 지웁니다", group: "작업" },
  { id: "convert", label: "변환", desc: "소스 목소리를 참조 목소리로 바꿉니다", group: "작업" },
  { id: "live", label: "실시간", desc: "마이크나 파일에서 실시간으로 제거합니다", group: "작업" },
];
export const labelOf = (id: NodeId) => NODES.find((n) => n.id === id)!.label;

export const go = (id: NodeId | "hub") => { location.hash = id === "hub" ? "#/" : `#/${id}`; };
const subscribe = (cb: () => void) => { addEventListener("hashchange", cb); return () => removeEventListener("hashchange", cb); };
const useRoute = (): NodeId | "hub" | "help" => {
  const h = useSyncExternalStore(subscribe, () => location.hash);
  const id = h.replace(/^#\/?/, "");
  return id === "help" ? "help" : NODES.some((n) => n.id === id) ? (id as NodeId) : "hub";
};

export function StatusBadge({ status }: { status: Status }) {
  return status === "진행 중"
    ? <span className="gc-badge gc-tone-neutral vk-badge-active">{status}</span>
    : <Badge tone={status === "완료" ? "success" : "neutral"}>{status}</Badge>;
}

function NavList({ route, onNavigate }: { route: string; onNavigate?: () => void }) {
  const { s } = useApp();
  const item = (id: NodeId | "hub" | "help", label: string, status?: Status) => (
    <a key={id} href={id === "hub" ? "#/" : `#/${id}`} aria-current={route === id ? "page" : undefined} onClick={onNavigate}>
      {label}{status && <StatusBadge status={status} />}
    </a>
  );
  return (
    <nav className="vk-nav" aria-label="주 메뉴">
      {item("hub", "작업 공간")}
      {item("help", "사용법")}
      {["공통 자원", "작업"].map((g) => (
        <div key={g} role="group" aria-labelledby={`g-${g === "작업" ? "task" : "res"}`} className="vk-nav">
          <h2 id={`g-${g === "작업" ? "task" : "res"}`}>{g}</h2>
          {NODES.filter((n) => n.group === g).map((n) => item(n.id, n.label, statusOf(s, n.id)))}
        </div>
      ))}
    </nav>
  );
}

function Shell() {
  const { s } = useApp();
  const route = useRoute();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const done = NODES.filter((n) => statusOf(s, n.id) === "완료").length;
  return (
    <div className="vk-app">
      <aside className="vk-rail">
        <div className="vk-brand">Voice <b>Killer</b></div>
        <NavList route={route} />
      </aside>
      <header className="vk-topbar">
        <span className="vk-where">{route === "hub" ? "작업 공간" : route === "help" ? "사용법" : labelOf(route)}</span>
        <span className="vk-sum">{done}/{NODES.length} 완료</span>
        <Drawer
          isOpen={isMenuOpen} onOpenChange={setIsMenuOpen} title="메뉴"
          trigger={<Button variant="secondary" aria-label="메뉴 열기"><Menu size={18} aria-hidden="true" /> 메뉴</Button>}
        >
          <NavList route={route} onNavigate={() => setIsMenuOpen(false)} />
        </Drawer>
      </header>
      <main className="vk-main">
        {route === "hub" ? <Hub /> : route === "help" ? <Help /> : route === "source" ? <SourcePanel /> : route === "reference" ? <ReferencePanel />
          : route === "live" ? <Live /> : <TaskPanel key={route} task={route} />}
      </main>
    </div>
  );
}

export function App() {
  return <ToastProvider><AppProvider><Shell /></AppProvider></ToastProvider>;
}
