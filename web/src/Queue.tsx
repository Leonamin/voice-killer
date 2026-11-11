import { useEffect, useState } from "react";

/** While a request is running, shows how many requests the server holds (running + waiting, including this one). */
export function QueueNote() {
  const [pending, setPending] = useState<number | null>(null);
  useEffect(() => {
    let isAlive = true;
    const poll = () => fetch("/api/queue").then((r) => r.json()).then((j) => isAlive && setPending(j.pending)).catch(() => {});
    poll();
    const t = setInterval(poll, 2000);
    return () => { isAlive = false; clearInterval(t); };
  }, []);
  if (pending === null) return null;
  return <p className="vk-muted" style={{ margin: 0 }} aria-live="polite">{pending > 1 ? `서버가 처리 중이거나 기다리는 요청 ${pending}건 (내 요청 포함). 한 번에 1건씩 처리합니다.` : "대기 중인 다른 요청이 없습니다."}</p>;
}
