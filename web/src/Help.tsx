import type { ReactNode } from "react";
import { Alert, Button } from "./ui/components";
import { go } from "./App";
import hub from "./manual/01-hub.png";
import sourceEmpty from "./manual/02-source-empty.png";
import sourceLoaded from "./manual/03-source-loaded.png";
import reference from "./manual/04-reference.png";
import removeBefore from "./manual/06-remove-before.png";
import removeResult from "./manual/07-remove-result.png";

function Step({ n, title, img, alt, children }: { n: number; title: string; img?: string; alt?: string; children: ReactNode }) {
  return (
    <li className="vk-step">
      <h3 className="vk-title"><span className="vk-step-n" aria-hidden="true">{n}</span>{title}</h3>
      <div className="vk-step-body">{children}</div>
      {img && <img src={img} alt={alt} loading="lazy" />}
    </li>
  );
}

export function Help() {
  return (
    <section className="vk-panel" aria-labelledby="panel-title">
      <header>
        <h1 id="panel-title" className="vk-display">사용법</h1>
        <p>화면 순서대로 따라 하면 됩니다. 아래 화면은 스티브 잡스 발표 60초 데모 파일로 찍었습니다.</p>
      </header>

      <Alert tone="neutral" title="먼저 알아 둘 것">
        작업 결과는 서버에 저장되지 않습니다. 새로고침하면 올린 오디오와 결과가 사라지니, 마음에 드는 결과는 <b>다운로드</b>로 받아 두세요.
      </Alert>

      <h2 className="vk-title">전체 흐름</h2>
      <p className="vk-muted" style={{ margin: 0 }}>
        <b>원본 오디오</b>(처리할 파일) → <b>기준 목소리</b>(크기를 바꿀 사람의 목소리) → <b>목소리 크기 조절</b> 순서입니다.
        왼쪽 메뉴 오른쪽의 <b>필요 / 진행 중 / 완료</b> 배지로 지금 어디까지 했는지 볼 수 있습니다.
      </p>
      <img className="vk-shot" src={hub} alt="작업 공간: 3개 메뉴가 모두 '필요' 상태이고 '다음: 원본 오디오 불러오기' 버튼이 있다" loading="lazy" />

      <h2 className="vk-title">1. 원본 오디오 정하기</h2>
      <ol className="vk-steps">
        <Step n={1} title="오디오 올리기 또는 녹음" img={sourceEmpty} alt="원본 오디오 화면: 파일 올리기, 녹음 시작 버튼">
          <b>파일 올리기</b>를 누르고 오디오나 영상 파일(wav, mp3, mp4, webm 등)을 고릅니다. 직접 말하려면 <b>녹음 시작</b>을 누르고 끝나면 <b>녹음 중지</b>를 누릅니다.
        </Step>
        <Step n={2} title="처리 구간 고르기" img={sourceLoaded} alt="원본 오디오 화면: 파형 전체가 주황색 처리 구간으로 선택되어 있다">
          파형 위의 <b>주황색 영역</b>이 처리할 구간입니다. 양쪽 끝을 끌어 줄이고, 가운데를 끌어 옮깁니다. <b>▶ 재생</b>은 파형에서 클릭한 지점부터 재생하고(다시 누르면 <b>⏸ 일시정지</b>), <b>⏮ 처리 구간 처음부터</b>는 구간 시작에서 다시 재생합니다. 구간 끝에 닿으면 멈춥니다. 버튼 옆에 현재 재생 위치가 <b>분:초.밀리초</b>로 표시되고, <b>음량</b> 슬라이더는 0~300%까지 조절합니다(100%를 넘기면 소리가 깨질 수 있습니다).
          처음에는 파일 전체가 선택됩니다. 원본 오디오와 기준 목소리 배지가 <b>완료</b>가 되면 준비된 것입니다.
        </Step>
      </ol>

      <h2 className="vk-title">2. 기준 목소리 정하기</h2>
      <ol className="vk-steps">
        <Step n={1} title="대상 목소리가 혼자 말하는 구간 지정" img={reference} alt="기준 목소리 화면: 기준 목소리 위치 선택과 초록색 기준 구간 파형">
          <b>기준 목소리</b>는 "이 사람의 목소리"를 알려 주는 견본입니다. <b>초록색 영역</b>을 대상이 <b>혼자 말하는 5~10초</b>에 맞추세요. 다른 소리가 섞이면 엉뚱한 목소리를 잡을 수 있습니다.
          <ul>
            <li><b>원본 오디오와 같은 파일</b>: 처리할 파일 안에서 그 사람이 혼자 말하는 곳을 고릅니다. 기본으로 처음 7초가 잡혀 있으니 꼭 확인하세요.</li>
            <li><b>다른 파일</b>: 그 사람의 목소리가 깨끗하게 들어 있는 별도 파일을 올립니다.</li>
          </ul>
          1초보다 짧으면 경고가 뜨고 진행할 수 없습니다.
        </Step>
      </ol>

      <h2 className="vk-title">3. 목소리 크기 조절하기</h2>
      <p className="vk-muted" style={{ margin: 0 }}>원본 오디오와 기준 목소리가 없어도 메뉴는 열립니다. 이때는 무엇이 빠졌는지 알려 주고, 바로 가는 버튼을 보여 줍니다.</p>
      <ol className="vk-steps">
        <Step n={1} title="크기를 정하고 실행" img={removeBefore} alt="목소리 크기 조절 화면: 크기 슬라이더와 실행 버튼">
          슬라이더는 <b>가운데(그대로)</b>에서 시작합니다. <b>왼쪽</b>으로 밀면 대상 목소리를 줄이고, <b>오른쪽</b>으로 밀면 키웁니다. 옆에 보이는 dB 수치는 시험 한 건에서 잰 값이라 파일마다 다를 수 있습니다.
          키우면 대상 목소리와 함께 주변 소리도 조금 커지고, 크게 키우면 소리가 깨질 수 있습니다. <b>실행</b>을 누르고 기다립니다.
        </Step>
        <Step n={2} title="원본과 결과를 번갈아 듣기" img={removeResult} alt="결과 화면: 결과 파형과 재생 위치·음량 조절, 원본/결과 전환 버튼, 다운로드 버튼">
          결과 파형(재생·위치 표시·음량 조절은 원본 오디오와 같습니다)으로 듣거나, <b>원본(A) ↔ 결과(B)</b> 버튼으로 같은 위치에서 바로 비교합니다. 마음에 들면 <b>다운로드</b>, 아니면 크기나 구간을 바꿔 <b>다시 실행</b>합니다.
        </Step>
      </ol>

      <h2 className="vk-title">잘 안 될 때</h2>
      <dl className="vk-faq">
        <dt>대상 목소리가 안 지워지거나 다른 사람이 지워져요</dt>
        <dd>기준 목소리 구간에 다른 소리가 섞였을 수 있습니다. 혼자 말하는 5~10초로 다시 지정하세요. 슬라이더를 왼쪽 끝으로 밀어 보는 것도 방법입니다.</dd>
        <dt>"다른 작업이 실행 중입니다"가 떠요</dt>
        <dd>서버는 한 번에 한 요청만 처리합니다. 앞 작업이 끝나면 실행할 수 있습니다.</dd>
        <dt>파형이 안 떠요</dt>
        <dd>수 분이 넘는 고음질 파일은 브라우저가 멈출 수 있습니다. 필요한 부분만 잘라서 올리세요.</dd>
        <dt>마이크가 안 켜져요</dt>
        <dd>브라우저는 HTTPS나 localhost에서만 마이크를 허용합니다. 주소가 https로 시작하는지, 마이크 권한을 허용했는지 확인하세요. 마이크는 원본 오디오 녹음에만 쓰입니다.</dd>
      </dl>

      <div className="vk-cta"><Button onClick={() => go("source")}>원본 오디오부터 시작하기</Button></div>
    </section>
  );
}
