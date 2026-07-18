'use client';

import { useState } from 'react';
import TopBar from '../../components/TopBar';

export default function PrivacyPage() {
  const [activeSection, setActiveSection] = useState<string>('intro');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const sections = [
    { id: 'intro', title: '개요 및 적용일자' },
    { id: 'art1', title: '제1조 개인정보 처리 목적' },
    { id: 'art2', title: '제2조 처리 및 보유 기간' },
    { id: 'art3', title: '제3조 처리 개인정보 항목' },
    { id: 'art4', title: '제4조 제3자 제공' },
    { id: 'art5', title: '제5조 개인정보 위탁' },
    { id: 'art6', title: '제6조 파기절차 및 방법' },
    { id: 'art7', title: '제7조 권리·의무 및 행사방법' },
    { id: 'art8', title: '제8조 안전성 확보조치' },
    { id: 'art9', title: '제9조 자동 수집 장치 거부' },
    { id: 'art10', title: '제10조 행태정보 수집·이용' },
    { id: 'art11', title: '제11조 추가적 이용·제공 기준' },
    { id: 'art12', title: '제12조 가명정보 처리' },
    { id: 'art13', title: '제13조 보호책임자 지정' },
    { id: 'art14', title: '제14조 국내대리인 지정' },
    { id: 'art15', title: '제15조 열람청구 접수부서' },
    { id: 'art16', title: '제16조 권익침해 구제방법' },
    { id: 'art17', title: '제17조 영상정보처리기기' },
  ];

  return (
    <div className="detective-bg min-h-screen text-slate-800 relative flex flex-col font-noto-sans-kr pb-16">
      <TopBar title="개인정보처리방침" backHref="/" centered />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 mt-8 relative z-10 animate-fade-in-up">
        {/* Header section with gradient */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            개인정보처리방침
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            부동산탐정은 정보주체의 개인정보를 소중히 보호하고 고충을 원활하게 처리하기 위해 최선을 다합니다.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Quick Scroll Sidebar */}
          <aside className="w-full md:w-64 shrink-0 bg-white/85 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 sticky top-20 max-h-[calc(100vh-120px)] overflow-y-auto hidden md:block">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-widest px-2 mb-3">
              목차
            </h3>
            <nav className="space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  id={`nav-link-${s.id}`}
                  onClick={() => scrollToSection(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeSection === s.id
                      ? 'bg-emerald-50 text-emerald-700 border-l-4 border-emerald-600 pl-2'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </nav>
          </aside>

          {/* Policy Text Card */}
          <div className="flex-1 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] p-6 sm:p-10 text-slate-700 leading-relaxed text-sm sm:text-base space-y-10">
            {/* Intro Section */}
            <section id="intro" className="scroll-mt-24 space-y-4">
              <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3">
                부동산탐정 개인정보처리방침
              </h3>
              <p className="text-slate-600">
                부동산탐정은(는) 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
              </p>
              <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-100">
                <span>적용 일자:</span>
                <span>2025년 9월 28일</span>
              </div>
            </section>

            {/* 제1조 */}
            <section id="art1" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제1조(개인정보의 처리 목적)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                부동산탐정은(는) 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
              </p>
              <ul className="list-decimal list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-600">
                <li><strong>홈페이지 회원가입 및 관리:</strong> 회원 가입의사 확인 목적으로 개인정보를 처리합니다.</li>
                <li><strong>민원사무 처리:</strong> 민원인의 신원 확인 목적으로 개인정보를 처리합니다.</li>
                <li><strong>재화 또는 서비스 제공:</strong> 서비스 제공을 목적으로 개인정보를 처리합니다.</li>
                <li><strong>마케팅 및 광고에의 활용:</strong> 신규 서비스(제품) 개발 및 맞춤 서비스 제공 등을 목적으로 개인정보를 처리합니다.</li>
                <li><strong>개인영상정보:</strong> 교통정보의 수집·분석 및 제공 등을 목적으로 개인정보를 처리합니다.</li>
              </ul>
            </section>

            {/* 제2조 */}
            <section id="art2" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제2조(개인정보의 처리 및 보유 기간)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                ① 부동산탐정은(는) 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
              </p>
              <p className="text-xs sm:text-sm text-slate-600">
                ② 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2">
                <p className="font-bold text-xs sm:text-sm text-slate-800">1. &lt;홈페이지 회원가입 및 관리&gt;</p>
                <p className="text-xs text-slate-600">
                  &lt;홈페이지 회원가입 및 관리&gt;와 관련한 개인정보는 수집·이용에 관한 동의일로부터 &lt;3년&gt;까지 위 이용목적을 위하여 보유·이용됩니다.
                </p>
                <ul className="list-disc list-inside text-xs text-slate-500 pl-2 space-y-1">
                  <li>보유근거: 소비자의 불만 또는 분쟁처리에 관한 기록</li>
                  <li>관련법령:</li>
                  <li className="pl-4">1) 소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
                  <li className="pl-4">2) 신용정보의 수집/처리 및 이용 등에 관한 기록: 3년</li>
                </ul>
              </div>
            </section>

            {/* 제3조 */}
            <section id="art3" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제3조(처리하는 개인정보의 항목)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                ① 부동산탐정은(는) 다음의 개인정보 항목을 처리하고 있습니다.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 text-xs sm:text-sm">
                <p className="font-bold text-slate-800">1. &lt; 홈페이지 회원가입 및 관리 &gt;</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  <li><strong>필수항목:</strong> 이메일</li>
                  <li><strong>선택항목:</strong> 생년월일</li>
                </ul>
              </div>
            </section>

            {/* 제4조 */}
            <section id="art4" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제4조(개인정보의 제3자 제공에 관한 사항)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                ① 부동산탐정은(는) 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 「개인정보 보호법」 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.
              </p>
              <p className="text-xs sm:text-sm text-slate-600">
                ② 부동산탐정은(는) 다음과 같이 개인정보를 제3자에게 제공하고 있습니다.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 text-xs sm:text-sm">
                <p className="font-bold text-slate-800">1. &lt; 부동산탐정 &gt;</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  <li><strong>개인정보를 제공받는 자:</strong> 부동산탐정</li>
                  <li><strong>제공받는 자의 개인정보 이용목적:</strong> 이메일</li>
                  <li><strong>제공받는 자의 보유·이용기간:</strong> 3년</li>
                </ul>
              </div>
            </section>

            {/* 제5조 */}
            <section id="art5" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제5조(개인정보처리의 위탁에 관한 사항)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                ① 부동산탐정은(는) 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-2 text-xs sm:text-sm">
                <p className="font-bold text-slate-800">1. &lt; 부동산탐정 &gt;</p>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  <li><strong>위탁받는 자 (수탁자):</strong> 부동산탐정</li>
                  <li><strong>위탁하는 업무의 내용:</strong> 회원제 서비스 이용에 따른 본인확인</li>
                  <li><strong>위탁기간:</strong> 3년</li>
                </ul>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                ② &lt; 부동산탐정 &gt;은(는) 위탁계약 체결시 「개인정보 보호법」 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적․관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리․감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.
              </p>
              <p className="text-xs sm:text-sm text-slate-600">
                ③ 위탁업무의 내용이나 수탁자가 변경될 경우에는 지체없이 본 개인정보 처리방침을 통하여 공개하도록 하겠습니다.
              </p>
            </section>

            {/* 제6조 */}
            <section id="art6" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제6조(개인정보의 파기절차 및 파기방법)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                ① 부동산탐정은(는) 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
              </p>
              <p className="text-xs sm:text-sm text-slate-600">
                ② 정보주체로부터 동의받은 개인정보 보유기간이 경과하거나 처리목적이 달성되었음에도 불구하고 다른 법령에 따라 개인정보를 계속 보존하여야 하는 경우에는, 해당 개인정보를 별도의 데이터베이스(DB)로 옮기거나 보관장소를 달리하여 보존합니다.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-500 space-y-1 pl-6">
                <p>1. 법령 근거: 관계법령에 따른 보존의무</p>
                <p>2. 보존하는 개인정보 항목: 계좌정보, 거래날짜 등</p>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                ③ 개인정보 파기의 절차 및 방법은 다음과 같습니다.
              </p>
              <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-600 space-y-1.5 pl-2">
                <li>
                  <strong>파기절차:</strong> 부동산탐정은(는) 파기 사유가 발생한 개인정보를 선정하고, &lt; 부동산탐정 &gt;의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.
                </li>
                <li>
                  <strong>파기방법:</strong> 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.
                </li>
              </ol>
            </section>

            {/* 제7조 */}
            <section id="art7" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제7조(정보주체와 법정대리인의 권리·의무 및 그 행사방법에 관한 사항)
              </h4>
              <ol className="list-decimal list-inside text-xs sm:text-sm text-slate-600 space-y-1.5 pl-2">
                <li>정보주체는 부동산탐정에 대해 언제든지 개인정보 열람·정정·삭제·처리정지 요구 등의 권리를 행사할 수 있습니다.</li>
                <li>제1항에 따른 권리 행사는 부동산탐정에 대해 「개인정보 보호법」 시행령 제41조제1항에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 부동산탐정은(는) 이에 대해 지체 없이 조치하겠습니다.</li>
                <li>제1항에 따른 권리 행사는 정보주체의 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실 수 있습니다. 이 경우 “개인정보 처리 방법에 관한 고시(제2020-7호)” 별지 제11호 서식에 따른 위임장을 제출하셔야 합니다.</li>
                <li>개인정보 열람 및 처리정지 요구는 「개인정보 보호법」 제35조 제4항, 제37조 제2항에 의하여 정보주체의 권리가 제한 될 수 있습니다.</li>
                <li>개인정보의 정정 및 삭제 요구는 다른 법령에서 그 개인정보가 수집 대상으로 명시되어 있는 경우에는 그 삭제를 요구할 수 없습니다.</li>
                <li>부동산탐정은(는) 정보주체 권리에 따른 열람의 요구, 정정·삭제의 요구, 처리정지의 요구 시 열람 등 요구를 한 자가 본인이거나 정당한 대리인인지를 확인합니다.</li>
              </ol>
            </section>

            {/* 제8조 */}
            <section id="art8" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제8조(개인정보의 안전성 확보조치에 관한 사항)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                &lt; 부동산탐정 &gt;은(는) 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 space-y-2 pl-2">
                <li><strong>내부관리계획의 수립 및 시행:</strong> 개인정보의 안전한 처리를 위하여 내부관리계획을 수립하고 시행하고 있습니다.</li>
                <li><strong>개인정보 취급 직원의 최소화 및 교육:</strong> 개인정보를 취급하는 직원을 지정하고 담당자에 한정시켜 최소화 하여 개인정보를 관리하는 대책을 시행하고 있습니다.</li>
                <li><strong>정기적인 자체 감사 실시:</strong> 개인정보 취급 관련 안정성 확보를 위해 정기적(분기 1회)으로 자체 감사를 실시하고 있습니다.</li>
                <li><strong>개인정보에 대한 접근 제한:</strong> 개인정보를 처리하는 데이터베이스시스템에 대한 접근권한의 부여,변경,말소를 통하여 개인정보에 대한 접근통제를 위하여 필요한 조치를 하고 있으며 침입차단시스템을 이용하여 외부로부터의 무단 접근을 통제하고 있습니다.</li>
                <li><strong>접속기록의 보관 및 위변조 방지:</strong> 개인정보처리시스템에 접속한 기록을 최소 1년 이상 보관, 관리하고 있으며, 다만, 5만명 이상의 정보주체에 관하여 개인정보를 추가하거나, 고유식별정보 또는 민감정보를 처리하는 경우에는 2년이상 보관, 관리하고 있습니다. 또한, 접속기록이 위변조 및 도난, 분실되지 않도록 보안기능을 사용하고 있습니다.</li>
                <li><strong>개인정보의 암호화:</strong> 이용자의 개인정보는 비밀번호는 암호화 되어 저장 및 관리되고 있어, 본인만이 알 수 있으며 중요한 데이터는 파일 및 전송 데이터를 암호화 하거나 파일 잠금 기능을 사용하는 등의 별도 보안기능을 사용하고 있습니다.</li>
                <li><strong>해킹 등에 대비한 기술적 대책:</strong> 부동산탐정은 해킹이나 컴퓨터 바이러스 등에 의한 개인정보 유출 및 훼손을 막기 위하여 보안프로그램을 설치하고 주기적인 갱신·점검을 하며 외부로부터 접근이 통제된 구역에 시스템을 설치하고 기술적/물리적으로 감시 및 차단하고 있습니다.</li>
                <li><strong>비인가자에 대한 출입 통제:</strong> 개인정보를 보관하고 있는 물리적 보관 장소를 별도로 두고 이에 대해 출입통제 절차를 수립, 운영하고 있습니다.</li>
                <li><strong>문서보안을 위한 잠금장치 사용:</strong> 개인정보가 포함된 서류, 보조저장매체 등을 잠금장치가 있는 안전한 장소에 보관하고 있습니다.</li>
              </ul>
            </section>

            {/* 제9조 */}
            <section id="art9" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제9조(개인정보를 자동으로 수집하는 장치의 설치·운영 및 그 거부에 관한 사항)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                부동산탐정은(는) 정보주체의 이용정보를 저장하고 수시로 불러오는 ‘쿠키(cookie)’를 사용하지 않습니다.
              </p>
            </section>

            {/* 제10조 */}
            <section id="art10" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제10조(행태정보의 수집·이용·제공 및 거부 등에 관한 사항)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                부동산탐정은(는) 온라인 맞춤형 광고 등을 위한 행태정보를 수집·이용·제공하지 않습니다.
              </p>
            </section>

            {/* 제11조 */}
            <section id="art11" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제11조(추가적인 이용·제공 판단기준)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                &lt; 부동산탐정 &gt; 은(는) ｢개인정보 보호법｣ 제15조제3항 및 제17조제4항에 따라 ｢개인정보 보호법 시행령｣ 제14조의2에 따른 사항을 고려하여 정보주체의 동의 없이 개인정보를 추가적으로 이용·제공할 수 있습니다. 이에 따라 &lt; 부동산탐정 &gt; 가(이) 정보주체의 동의 없이 추가적인 이용·제공을 하기 위해서 다음과 같은 사항을 고려하였습니다.
              </p>
              <ul className="list-disc list-inside text-xs sm:text-sm text-slate-600 space-y-1.5 pl-2">
                <li>개인정보를 추가적으로 이용·제공하려는 목적이 당초 수집 목적과 관련성이 있는지 여부</li>
                <li>개인정보를 수집한 정황 또는 처리 관행에 비추어 볼 때 추가적인 이용·제공에 대한 예측 가능성이 있는지 여부</li>
                <li>개인정보의 추가적인 이용·제공이 정보주체의 이익을 부당하게 침해하는지 여부</li>
                <li>가명처리 또는 암호화 등 안전성 확보에 필요한 조치를 하였는지 여부</li>
              </ul>
            </section>

            {/* 제12조 */}
            <section id="art12" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제12조(가명정보를 처리하는 경우 가명정보 처리에 관한 사항)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                &lt; 부동산탐정 &gt; 은(는) 현재 가명정보를 별도로 처리하고 있지 않습니다. 향후 처리 시 법률에 따른 안전성 확보조치를 완료한 후 공개하도록 하겠습니다.
              </p>
            </section>

            {/* 제13조 */}
            <section id="art13" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제13조 (개인정보 보호책임자에 관한 사항)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                ① 부동산탐정 은(는) 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs sm:text-sm">
                  <p className="font-bold text-slate-900 mb-2">▶ 개인정보 보호책임자</p>
                  <ul className="space-y-1.5 text-slate-600">
                    <li><strong>성명 / 직책:</strong> 유준열 / 대표이사</li>
                    <li><strong>연락처:</strong> 010-7515-1340</li>
                    <li><strong>이메일:</strong> <a href="mailto:ryussi0925@gmail.com" className="text-emerald-600 hover:underline">ryussi0925@gmail.com</a></li>
                  </ul>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs sm:text-sm">
                  <p className="font-bold text-slate-900 mb-2">▶ 개인정보 보호 담당부서</p>
                  <ul className="space-y-1.5 text-slate-600">
                    <li><strong>부서명:</strong> 회계부</li>
                    <li><strong>담당자:</strong> 유진열</li>
                    <li><strong>연락처:</strong> 010-2337-3484</li>
                  </ul>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600">
                ② 정보주체께서는 부동산탐정의 서비스(또는 사업)을 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만처리, 피해구제 등에 관한 사항을 개인정보 보호책임자 및 담당부서로 문의하실 수 있습니다. 부동산탐정은(는) 정보주체의 문의에 대해 지체 없이 답변 및 처리해드릴 것입니다.
              </p>
            </section>

            {/* 제14조 */}
            <section id="art14" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제14조(국내대리인의 지정)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                부동산탐정은 「개인정보 보호법」 제39조의11에 따른 국내대리인 의무 지정 대상에 해당하지 않으므로 국내대리인을 지정하지 않았습니다. 지정이 필요하게 되는 경우 지체 없이 해당 정보를 반영하도록 하겠습니다.
              </p>
            </section>

            {/* 제15조 */}
            <section id="art15" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제15조(개인정보의 열람청구를 접수·처리하는 부서)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                정보주체는 ｢개인정보 보호법｣ 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. &lt; 부동산탐정 &gt;은(는) 정보주체의 개인정보 열람청구가 신속하게 처리되도록 노력하겠습니다.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs sm:text-sm">
                <p className="font-bold text-slate-900 mb-2">▶ 개인정보 열람청구 접수·처리 부서</p>
                <ul className="space-y-1.5 text-slate-600">
                  <li><strong>부서명:</strong> 회계부</li>
                  <li><strong>담당자:</strong> 유진열</li>
                  <li><strong>연락처:</strong> 010-2337-3484, <a href="mailto:ryussi0925@gmail.com" className="text-emerald-600 hover:underline">ryussi0925@gmail.com</a></li>
                </ul>
              </div>
            </section>

            {/* 제16조 */}
            <section id="art16" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제16조(정보주체의 권익침해에 대한 구제방법)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                정보주체는 개인정보침해로 인한 구제를 받기 위하여 개인정보분쟁조정위원회, 한국인터넷진흥원 개인정보침해신고센터 등에 분쟁해결이나 상담 등을 신청할 수 있습니다. 이 밖에 기타 개인정보침해의 신고, 상담에 대하여는 아래의 기관에 문의하시기 바랍니다.
              </p>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs sm:text-sm">
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li><strong>개인정보분쟁조정위원회:</strong> (국번없이) 1833-6972 (<a href="https://www.kopico.go.kr" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">www.kopico.go.kr</a>)</li>
                  <li><strong>개인정보침해신고센터:</strong> (국번없이) 118 (<a href="https://privacy.kisa.or.kr" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">privacy.kisa.or.kr</a>)</li>
                  <li><strong>대검찰청:</strong> (국번없이) 1301 (<a href="https://www.spo.go.kr" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">www.spo.go.kr</a>)</li>
                  <li><strong>경찰청:</strong> (국번없이) 182 (<a href="https://ecrm.cyber.go.kr" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">ecrm.cyber.go.kr</a>)</li>
                </ol>
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                「개인정보보호법」제35조(개인정보의 열람), 제36조(개인정보의 정정·삭제), 제37조(개인정보의 처리정지 등)의 규정에 의한 요구에 대 하여 공공기관의 장이 행한 처분 또는 부작위로 인하여 권리 또는 이익의 침해를 받은 자는 행정심판법이 정하는 바에 따라 행정심판을 청구할 수 있습니다.
              </p>
              <p className="text-xs text-slate-500 pl-2">
                ※ 행정심판에 대해 자세한 사항은 중앙행정심판위원회(<a href="https://www.simpan.go.kr" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">www.simpan.go.kr</a>) 홈페이지를 참고하시기 바랍니다.
              </p>
            </section>

            {/* 제17조 */}
            <section id="art17" className="scroll-mt-24 space-y-3">
              <h4 className="font-extrabold text-slate-900 border-l-4 border-emerald-500 pl-2">
                제17조(영상정보처리기기 운영·관리에 관한 사항)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                부동산탐정은(는) 현재 오프라인 매장을 운영하지 않거나 물리적인 영상정보처리기기(CCTV)를 설치·운영하고 있지 않습니다. 향후 영상정보처리기기를 도입하는 경우, 법적 기준에 맞춰 설치·운영에 관한 사항을 본 개인정보처리방침을 통해 투명하게 공개하겠습니다.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
