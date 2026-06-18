'use client';

import { useState } from 'react';
import Link from 'next/link';
import TopBar from '../../components/TopBar';

export default function TermsPage() {
  const [activeTab, setActiveTab] = useState<'service' | 'shorts'>('service');

  return (
    <div className="detective-bg min-h-screen text-slate-800 relative flex flex-col font-noto-sans-kr pb-16">
      <TopBar title="이용약관" backHref="/" centered />
      
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 mt-8 relative z-10 animate-fade-in-up">
        {/* Header section with gradient */}
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            서비스 이용약관
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            부동산탐정 서비스 및 API 클라이언트 이용에 관한 규정과 권리·의무를 안내해 드립니다.
          </p>
        </div>

        {/* Custom Tab Switcher with micro-interactions */}
        <div className="flex p-1 bg-slate-200/80 backdrop-blur-sm rounded-xl mb-8 max-w-md mx-auto border border-slate-300/30">
          <button
            id="tab-service-btn"
            onClick={() => setActiveTab('service')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${
              activeTab === 'service'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/40'
            }`}
          >
            부동산탐정 서비스 약관
          </button>
          <button
            id="tab-shorts-btn"
            onClick={() => setActiveTab('shorts')}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all duration-300 ${
              activeTab === 'shorts'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/40'
            }`}
          >
            My Shorts Uploader 약관
          </button>
        </div>

        {/* Main Content Area */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgba(15,23,42,0.04)] p-6 sm:p-10 overflow-hidden">
          {activeTab === 'service' ? (
            <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-700">
              <div>
                <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6">
                  부동산탐정 서비스 이용약관
                </h3>
              </div>

              {/* 제1장 총칙 */}
              <section className="space-y-4">
                <h4 className="text-base font-extrabold text-emerald-700 uppercase tracking-wider">
                  제 1 장 총 칙
                </h4>
                
                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900">제1조 (목적)</h5>
                  <p className="text-xs sm:text-sm text-slate-600">
                    본 약관은 모바일 어플리케이션 등 회사가 운영하는 플랫폼(이하 "부동산탐정"이라 함)을 통해 제공하는 일체의 서비스(이하 “서비스”라 함)의 이용과 관련하여 회사와 이용자 사이의 법률관계 및 기타 필요한 사항을 규정함을 목적으로 합니다. 부동산탐정 서비스라 함은 회사가 제공하는 부동산탐정 브랜드를 사용하는 서비스를 말합니다. 회원 또는 비회원으로서 부동산탐정 서비스를 이용하시는 여러분은 본 약관 및 관련 운영정책을 확인 또는 동의하게 되므로, 조금만 시간을 내서 주의 깊게 살펴봐 주시기 바랍니다.
                  </p>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900">제2조 (정의)</h5>
                  <p className="text-xs sm:text-sm text-slate-600 mb-2">
                    이 약관에서 사용하는 용어의 정의는 다음과 같습니다.
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-600">
                    <li><strong className="text-slate-800">회원:</strong> 회사에 개인정보를 제공하여 회원등록을 한 자를 말합니다.</li>
                    <li><strong className="text-slate-800">비회원:</strong> 회원등록 없이 서비스를 이용하는 자로서, 회사 제공하는 일부 서비스 이용에 제한을 받을 수 있습니다.</li>
                    <li><strong className="text-slate-800">이용자:</strong> 부동산탐정 플랫폼을 통해 회사가 제공하는 각종 서비스를 이용하는 자로서 회원 및 비회원을 포함합니다.</li>
                    <li><strong className="text-slate-800">콘텐츠공급자:</strong> 서비스에 게재될 수 있도록 회사에 각종 정보 및 콘텐츠 등 내용물 일체를 제공하는 주체로서 사람이나 기관을 의미합니다. 대표적으로 이용자 등이 있습니다.</li>
                    <li><strong className="text-slate-800">자료:</strong> 콘텐츠공급자가 제공한 각종 정보, 콘텐츠로써 서비스 상에 게시된 부호, 문자, 음성, 음향, 화상, 동영상 등의 정보 형태의 글, 사진, 동영상 및 각종 파일, 링크, 다운로드, 광고 등을 포함하여 본 서비스에 게시물 형태로 포함되어 있거나, 본 서비스를 통해 배포, 전송되거나, 본 서비스로부터 접근되는 정보를 의미합니다.</li>
                    <li><strong className="text-slate-800">아이디(ID):</strong> 회원의 식별과 서비스 이용을 위하여 회원이 설정하고 회사가 승인한 회원 본인의 문자와 숫자의 조합을 의미하며 회원이 설정한 이메일 주소 등이 포함됩니다.</li>
                    <li><strong className="text-slate-800">비밀번호:</strong> 회원의 동일성 확인과 회원정보의 보호를 위하여 회원이 설정하고 회사가 승인한 문자나 숫자의 조합을 말합니다.</li>
                    <li><strong className="text-slate-800">유료서비스:</strong> 부동산탐정서비스를 통해 유료로 이용 가능한 회사 또는 링크사용자 등 회사와 계약을 체결한 제3자가 제공하는 각종 온라인 디지털 콘텐츠 및 제반 서비스를 말합니다. 정보 및 광고 게시 서비스 등이 포함됩니다.</li>
                  </ul>
                  <p className="text-xs text-slate-500 mt-2 pl-2">
                    ※ 이 약관에서 사용하는 용어 중 본 조에서 정하지 아니한 것은 관계법령 및 일반관례에 따릅니다.
                  </p>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900">제3조 (약관의 명시, 효력 및 변경)</h5>
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-600">
                    <li>회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 회사가 제공하는 서비스에 공지합니다. 다만, 약관의 내용은 이용자가 연결화면을 통하여 볼 수 있도록 할 수 있습니다. 이용자는 회사가 제공하는 서비스를 사용할 경우 이용약관에 동의한 것으로 간주합니다.</li>
                    <li>회사는 『약관의 규제에 관한 법률』, 『정보통신망 이용촉진 및 정보보호 등에 관한 법률』 등 관련법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</li>
                    <li>회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 최소 7일, 이용자에게 불리한 내용이 있는 경우에는 30일 전에 이용자가 알기 쉽도록 표시하여 공지합니다.</li>
                    <li>회사가 약관을 개정할 경우에는 변경된 약관은 적용일자를 명시한 경우 그 시점부터, 적용일자를 명시하지 않은 경우에는 공지 후 30일 후 그 효력이 발생하며, 이용자는 약관이 변경된 후에도 본 서비스를 계속 이용함으로써 변경 후의 약관에 대해 동의를 한 것으로 간주됩니다.</li>
                    <li>이용자는 개정약관에 동의하지 않을 경우 제8조 1항에 따라 이용계약을 해지할 수 있습니다. 다만, 기존 약관을 적용할 수 없는 특별한 사정이 있는 경우에는 회사는 이용계약을 해지할 수 있습니다.</li>
                    <li>이 약관에서 정하지 아니한 사항과 이 약관의 해석에 관하여는 『전자상거래 등에서의 소비자 보호에 관한 법률』, 『약관의 규제에 관한 법률』, 『전자상거래 등에서의 소비자 보호지침』 및 관계법령 및 상관례에 따릅니다.</li>
                  </ol>
                </div>
              </section>

              {/* 제2장 서비스의 이용 */}
              <section className="space-y-4">
                <h4 className="text-base font-extrabold text-emerald-700 uppercase tracking-wider">
                  제 2 장 서 비 스 의 이 용
                </h4>

                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900">제4조 (위치기반서비스 제공)</h5>
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-600">
                    <li>회사는 이용자에게 유용한 서비스를 제공하기 위하여 서비스에 위치기반서비스를 포함시킬 수 있습니다.</li>
                    <li>
                      회사의 위치기반서비스는 이용자의 단말기기의 위치정보를 수집하는 위치정보 사업자로부터 위치정보를 전달 받아 이용자에게 제공하는 서비스이며, 구체적으로는 다음과 같은 목적에 사용됩니다.
                      <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                        <li>이용자의 현재 위치 또는 특정 위치에 대한 정보를 활용하여 생성한 정보를 제공</li>
                        <li>이용자의 위치를 이용한 광고성 정보 제공</li>
                        <li>이용자의 위치를 통계작성, 학술연구 또는 시장조사를 위하여 특정 개인을 알아볼 수 없는 형태로 가공하여 정보 제공</li>
                      </ul>
                    </li>
                    <li>회사는 위치정보의 보호 및 이용 등에 관한 법률의 규정에 따라 개인위치정보 및 위치정보 이용ㆍ제공사실 확인 데이터를 6개월 이상 보관합니다.</li>
                    <li>이용자의 무선서비스 이용 시 발생하는 데이터 통신료는 별도이며, 이용자께서 가입한 각 이동통신사의 정책에 따릅니다.</li>
                  </ol>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900">제5조 (유료서비스의 이용)</h5>
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-600">
                    <li>회사는 기본적으로 무료로 서비스를 제공하고 있으나, 광고 등의 일부 서비스의 경우 유료로 제공할 수 있습니다.</li>
                    <li>회사의 유료서비스의 이용가능기기 및 이용에 필요한 최소한의 기술사양은 권장사양정보에 따릅니다.</li>
                    <li>회사는 유료서비스를 제공함에 있어 유료서비스의 교환ㆍ반품ㆍ보증과 그 대금 환불의 조건 및 절차에 관한 사항을 제공합니다.</li>
                    <li>이용자는 회사가 제공하는 유료서비스를 이용하는 경우 이용대금을 납부한 후 이용하는 것을 원칙으로 합니다.</li>
                    <li>회사가 제공하는 유료서비스에 대한 이용요금의 결제 방법은 계좌이체, 신용카드결제, 무통장입금 등이 있으며, 유료서비스마다 결제 방법의 차이가 있을 수 있으며, 이용자는 회사가 정하고 인정하는 방식에 따라 결제를 이행하여야 합니다.</li>
                    <li>정기적인 결제가 이루어지는 서비스의 경우 이용자 개인이 해당 서비스의 이용을 중단하고 정기 결제의 취소를 요청하지 않는 한 정기적인 결제는 계속 이루어집니다.</li>
                    <li>회사는 결제의 이행을 위하여 이용자의 개인정보를 추가적으로 요구할 수 있으며, 이용자는 회사가 요구하는 개인정보를 정확하게 제공하여야 합니다.</li>
                    <li>이용자는 본 약관 및 회사가 유료서비스와 관련하여 고지하는 내용을 준수하여야 하며, 약관 및 고지 내용을 위반하거나 이행하지 아니하여 발생하는 모든 손실, 손해에 대하여 책임을 부담합니다. 이용자가 본 약관 및 정책을 위반하여 회사가 이용자에게 유료서비스 이용을 제한하거나 계약을 해지하는 경우 회사는 일체의 환불을 하지 않습니다.</li>
                    <li>회사가 제공하는 유료서비스 이용을 위해 이용대금의 납부, 환불 방법, 이의제기 등 구체적인 내용은 회사가 정하는 별도의 규정에 따릅니다. 이용자의 개인정보도용 및 결제사기로 인한 환불요청 또는 결제자의 개인정보 요구는 법률이 정한 경우 외에는 거절될 수 있습니다.</li>
                    <li>이용자는 유료서비스 이용 전에 반드시 회사가 제공하는 유료서비스의 상세 내용과 이용 조건을 정확하게 확인한 후 구매를 하여야 합니다. 이용자가 이용 조건을 확인하지 않고 구매하여 발생한 모든 손실, 손해에 대한 책임을 부담합니다.</li>
                    <li>
                      이용자가 유료서비스를 이용할 때 다음 각호에 해당하는 행위를 금지합니다.
                      <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                        <li>회사가 제공하는 유료서비스 이용방법에 의하지 아니하고 비정상적인 방법으로 유료서비스를 이용하거나 시스템에 접근하는 행위</li>
                        <li>타인의 명의, 카드정보, 계좌정보 등을 도용하여 회사가 제공하는 유료서비스를 이용하는 행위</li>
                        <li>회사가 정하지 않은 비정상적인 방법으로 유료서비스를 취득하거나 사용하는 행위</li>
                      </ul>
                    </li>
                  </ol>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900">제6조 (환불)</h5>
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-600">
                    <li>이용자가 이용요금 환불을 회사에 요구할 경우 회사가 정하는 별도의 규정에 따라 환불이 필요하다고 판단된다면 회사의 규정에 따라 환불 관련 절차를 진행해야 합니다. 회사는 이용자의 요청에 따라 검토 후 환불에 필요한 조치를 신속하게 합니다.</li>
                    <li>유료회원(중기업체)이 이용자의 견적서 요청에 응한 경우를 제외하고는 유료서비스의 구독취소를 요청할 수 있습니다. 구독취소 시 유료서비스 결제 금액의 결제일로부터 7일 전에는 100%, 결제일로부터 7일이 지난 경우에는 90%에 해당하는 금액을 환불받을 수 있습니다.</li>
                  </ol>
                </div>
              </section>

              {/* 제3장 당사자의 의무 및 외부 서비스 */}
              <section className="space-y-4">
                <h4 className="text-base font-extrabold text-emerald-700 uppercase tracking-wider">
                  제 3 장 당 사 자 의 의 무 및 외 부 서 비 스
                </h4>

                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900">제7조 (회사의 의무)</h5>
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-600">
                    <li>회사는 관계 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위하여 최선을 다하여 노력합니다. 다만, 서비스설비의 정기점검 등의 사유로 회사가 서비스를 특정범위로 분할하여 별도로 서비스 이용 가능 날짜와 시간을 정할 수 있습니다.</li>
                    <li>회사는 이용자가 안전하게 서비스를 이용할 수 있도록 개인정보(신용정보 포함) 보호를 위해 보안시스템을 갖추어야 하며 개인정보처리방침을 공시하고 준수합니다.</li>
                    <li>회사는 서비스이용과 관련하여 이용자로부터 제기된 의견이나 불만이 정당하다고 인정할 경우에는 이를 처리하여야 합니다. 이용자가 제기한 의견이나 불만사항에 대해서는 전자우편주소 등을 통하여 이용자에게 처리과정 및 결과를 전달할 수 있습니다.</li>
                    <li>회사는 콘텐츠공급자가 제공한 자료를 이용자가 확인하고 이용할 수 있도록 시스템을 운영ㆍ관리ㆍ제공합니다.</li>
                    <li>회사는 법령상 허용되는 한도 내에서 서비스와 관련하여 본 약관에 명시되지 않은 어떠한 구체적인 사항에 대한 약정이나 보증을 하지 않습니다.</li>
                    <li>서비스에 게재된 자료에 대한 책임은 콘텐츠공급자에게 있습니다. 회사는 그에 대한 사실의 신뢰도, 정확성 등에 대해서는 보증을 하지 않으며, 회사의 고의 또는 중대한 과실 없이 발생한 손해에 대하여는 책임을 부담하지 않습니다. 다만, 회사는 이런 정보가 더욱 정확하고 신뢰할 수 있도록 서비스 운영에 노력을 기울이며, 이용자의 신고를 받은 정보들에 대해 적극 대응하는 조치를 취하는 등 서비스 관리자로서의 책임을 부담합니다.</li>
                  </ol>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900">제8조 (YouTube API 서비스 이용 안내)</h5>
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-600">
                    <li>본 서비스는 유튜브 채널 동영상 자동 업로드 등의 기능 제공을 위해 YouTube API Services를 사용합니다.</li>
                    <li>본 서비스를 이용하는 사용자는 Google 개인정보처리방침(<a href="http://www.google.com/policies/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold hover:underline">http://www.google.com/policies/privacy</a>)의 적용을 받으며, 본 서비스를 이용함과 동시에 이에 동의한 것으로 간주합니다.</li>
                  </ol>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-2">
                  <h5 className="font-bold text-slate-900">제9조 (유튜브 데이터 수집 및 철회/삭제 안내)</h5>
                  <ol className="list-decimal list-inside space-y-1.5 pl-2 text-xs sm:text-sm text-slate-600">
                    <li>본 서비스는 유튜브 업로드를 위해 필요한 최소한의 계정 인증 정보(OAuth 토큰)를 수집 및 보관합니다.</li>
                    <li>사용자는 언제든지 Google 보안 설정 페이지에서 본 서비스의 유튜브 데이터 접근 권한을 철회할 수 있습니다.</li>
                    <li>본 서비스가 보관 중인 유튜브 관련 데이터의 즉각적인 삭제를 원하시는 경우, 개발자 문의 이메일(<a href="mailto:ryussi0925@gmail.com" className="text-emerald-600 font-bold hover:underline">ryussi0925@gmail.com</a>)로 요청하시면 즉시 안전하게 파기 처리됩니다.</li>
                  </ol>
                </div>
              </section>
            </div>
          ) : (
            <div className="space-y-8 text-sm sm:text-base leading-relaxed text-slate-700">
              <div>
                <h3 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6">
                  Terms of Service (서비스 이용약관)
                </h3>
              </div>

              <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-100 text-xs sm:text-sm text-slate-600 mb-6">
                This document governs the use of the <strong>"My Shorts Uploader"</strong> API client tool developed for internal real estate data visualization and automated YouTube uploading.
              </div>

              <section className="space-y-6">
                <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 space-y-2">
                  <h5 className="font-extrabold text-sm text-emerald-700 tracking-wide uppercase">Article 1 (Purpose)</h5>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium">
                    This Terms of Service regulates the use of the "My Shorts Uploader" API client tool developed for internal real estate data visualization and automated YouTube uploading.
                  </p>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 space-y-2">
                  <h5 className="font-extrabold text-sm text-emerald-700 tracking-wide uppercase">Article 2 (Authorized Use)</h5>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium">
                    The API client is strictly used for uploading authorized real estate analysis videos to the official channel. Unauthorized distribution or commercial sale of this client tool is prohibited.
                  </p>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 space-y-2">
                  <h5 className="font-extrabold text-sm text-emerald-700 tracking-wide uppercase">Article 3 (Compliance with YouTube Terms)</h5>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium">
                    Users of this tool must comply with the YouTube Terms of Service and Developer Policies. Any actions that violate YouTube community guidelines are strictly prohibited.
                  </p>
                </div>

                <div className="bg-slate-50/60 rounded-xl p-5 border border-slate-100 space-y-2">
                  <h5 className="font-extrabold text-sm text-emerald-700 tracking-wide uppercase">Article 4 (Limitation of Liability)</h5>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium">
                    The developer is not responsible for any issues arising from API quota limitations, YouTube channel restrictions, or network errors during automated uploads.
                  </p>
                </div>
              </section>

              <div className="border-t border-slate-100 pt-6 mt-8 space-y-2 text-xs sm:text-sm text-slate-500">
                <p>
                  <strong>Developer Contact:</strong>{' '}
                  <a href="mailto:ryussi0925@gmail.com" className="text-emerald-600 font-bold hover:underline">
                    ryussi0925@gmail.com
                  </a>
                </p>
                <p className="text-[11px] text-slate-400">
                  [출처] Terms of Service (서비스 이용약관) | 작성자 부동산탐정
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
