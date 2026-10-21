import type { ReactNode } from "react";
import { Alert, Button } from "./ui/components";
import { go } from "./App";
import hub from "./manual/01-hub.png";
import sourceEmpty from "./manual/02-source-empty.png";
import sourceLoaded from "./manual/03-source-loaded.png";
import reference from "./manual/04-reference.png";
import removeBefore from "./manual/06-remove-before.png";
import removeResult from "./manual/07-remove-result.png";
import convert from "./manual/08-convert.png";
import live from "./manual/09-live.png";

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
        <b>원본 오디오</b>(처리할 파일) → <b>기준 목소리</b>(지울/뽑을 사람의 목소리) → <b>기능</b>(목소리 추출·제거·변환, 실시간 목소리 제거) 순서입니다.
        왼쪽 메뉴 오른쪽의 <b>필요 / 진행 중 / 완료</b> 배지로 지금 어디까지 했는지 볼 수 있습니다.
      </p>
      <img className="vk-shot" src={hub} alt="작업 공간: 6개 메뉴가 모두 '필요' 상태이고 '다음: 원본 오디오 불러오기' 버튼이 있다" loading="lazy" />

      <h2 className="vk-title">1. 원본 오디오 정하기</h2>
      <ol className="vk-steps">
        <Step n={1} title="오디오 올리기 또는 녹음" img={sourceEmpty} alt="원본 오디오 화면: 파일 올리기, 녹음 시작 버튼">
          <b>파일 올리기</b>를 누르고 오디오나 영상 파일(wav, mp3, mp4, webm 등)을 고릅니다. 직접 말하려면 <b>녹음 시작</b>을 누르고 끝나면 <b>녹음 중지</b>를 누릅니다.
        </Step>
        <Step n={2} title="처리 구간 고르기" img={sourceLoaded} alt="원본 오디오 화면: 파형 전체가 주황색 처리 구간으로 선택되어 있다">
          파형 위의 <b>주황색 영역</b>이 처리할 구간입니다. 양쪽 끝을 끌어 줄이고, 가운데를 끌어 옮깁니다. <b>▶ 재생</b>은 파형에서 클릭한 지점부터 재생하고(다시 누르면 <b>⏸ 일시정지</b>), <b>⏮ 처리 구간 처음부터</b>는 구간 시작에서 다시 재생합니다. 구간 끝에 닿으면 멈춥니다.
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

      <h2 className="vk-title">3. 기능 실행하기</h2>
      <p className="vk-muted" style={{ margin: 0 }}>원본 오디오와 기준 목소리가 없어도 기능 메뉴는 열립니다. 이때는 무엇이 빠졌는지 알려 주고, 바로 가는 버튼을 보여 줍니다.</p>

      <h3 className="vk-title">목소리 제거: 대상 목소리만 지우기</h3>
      <ol className="vk-steps">
        <Step n={1} title="강도를 정하고 실행" img={removeBefore} alt="목소리 제거 화면: 강도 슬라이더와 실행 버튼">
          <b>강도</b> 1.00이 가장 강하게 지우고, 낮출수록 대상 목소리가 더 남습니다. <b>실행</b>을 누르고 기다립니다.
        </Step>
        <Step n={2} title="원본과 결과를 번갈아 듣기" img={removeResult} alt="목소리 제거 결과: 오디오 플레이어, 원본/결과 전환 버튼, 다운로드 버튼">
          결과 플레이어로 듣거나, <b>원본(A) ↔ 결과(B)</b> 버튼으로 같은 위치에서 바로 비교합니다. 마음에 들면 <b>다운로드</b>, 아니면 강도나 구간을 바꿔 <b>다시 실행</b>합니다.
        </Step>
      </ol>

      <h3 className="vk-title">목소리 추출: 대상 목소리만 남기기</h3>
      <p className="vk-muted" style={{ margin: 0 }}>
        사용법은 목소리 제거와 같고 결과만 반대입니다. 섞인 소리에서 기준 목소리와 같은 사람의 목소리만 남깁니다.
        결과의 <b>이 결과를 기준 목소리로 쓰기</b> 버튼을 누르면 깨끗해진 목소리가 곧바로 기준 목소리가 되어, 변환에서 "닮을 목소리"로 쓸 수 있습니다.
      </p>

      <h3 className="vk-title">목소리 변환: 내 목소리를 다른 사람 목소리로</h3>
      <ol className="vk-steps">
        <Step n={1} title="원본 오디오와 기준 목소리의 뜻이 다릅니다" img={convert} alt="목소리 변환 화면: 품질 선택과 안내 문구">
          변환에서는 <b>처리 구간 = 바꿀 목소리</b>(내가 말한 것), <b>기준 목소리 = 닮을 목소리</b>(되고 싶은 사람)입니다. 원본 오디오는 최대 60초, 기준 목소리는 최대 30초입니다.
          <b>품질 (10)</b>은 느리지만 더 낫고 <b>빠름 (4)</b>는 빠릅니다. 음원 길이의 약 2~3배가 걸리며, 결과에는 <b>합성 음성</b> 표시가 붙습니다.
        </Step>
      </ol>

      <h3 className="vk-title">실시간 목소리 제거: 마이크 소리에서 바로 지우기</h3>
      <ol className="vk-steps">
        <Step n={1} title="헤드폰을 끼고 시작" img={live} alt="실시간 목소리 제거 화면: 헤드폰 경고, 입력 선택, 시작과 정지 버튼">
          스피커를 쓰면 소리가 마이크로 되돌아가 울립니다. <b>반드시 헤드폰</b>을 쓰세요.
          <ul>
            <li><b>등록 음성</b>: 지울 목소리의 견본입니다. 기준 목소리 구간을 쓰거나, 그 사람 목소리를 마이크로 1~30초 녹음합니다.</li>
            <li><b>입력</b>: 마이크 소리를 바로 처리하거나, 원본 오디오의 처리 구간을 실시간 속도로 재생하며 처리합니다. 파일 입력일 때는 <b>원본 듣기</b>로 처리 전 소리와 비교할 수 있습니다.</li>
            <li><b>블록</b>: 1초와 2초 중에서 고릅니다. 1초가 지연이 짧아 총지연이 약 1.6초, 2초는 약 2.9초입니다(시연 PC 측정값).</li>
          </ul>
          <b>시작</b>을 누르면 처리된 소리가 나오고 <b>정지</b>로 멈춥니다. 아래 지표에서 서버 왕복 시간과 예상 총 지연을 볼 수 있습니다.
        </Step>
      </ol>

      <h2 className="vk-title">잘 안 될 때</h2>
      <dl className="vk-faq">
        <dt>대상 목소리가 안 지워지거나 다른 사람이 지워져요</dt>
        <dd>기준 목소리 구간에 다른 소리가 섞였을 수 있습니다. 혼자 말하는 5~10초로 다시 지정하세요. 목소리 제거 강도를 1.00으로 올려 보는 것도 방법입니다.</dd>
        <dt>"다른 작업이 실행 중입니다"가 떠요</dt>
        <dd>서버는 한 번에 한 요청만 처리합니다. 앞 작업이 끝나면 실행할 수 있습니다.</dd>
        <dt>파형이 안 떠요</dt>
        <dd>수 분이 넘는 고음질 파일은 브라우저가 멈출 수 있습니다. 필요한 부분만 잘라서 올리세요.</dd>
        <dt>마이크가 안 켜져요</dt>
        <dd>브라우저는 HTTPS나 localhost에서만 마이크를 허용합니다. 주소가 https로 시작하는지, 마이크 권한을 허용했는지 확인하세요.</dd>
      </dl>

      <div className="vk-cta"><Button onClick={() => go("source")}>원본 오디오부터 시작하기</Button></div>
    </section>
  );
}
