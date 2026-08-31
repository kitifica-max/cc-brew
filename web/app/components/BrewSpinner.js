'use client';

// Loader de marca — mismo mark animado del splash/landing (pilas de formas que
// se bambolean), a escala reducida para usarse inline en botones y estados de carga.
export default function BrewSpinner({ size = 20 }) {
  const width = size * (387.29 / 1078.8);
  return (
    <svg
      width={width} height={size}
      viewBox="0 0 387.29 1078.8"
      style={{ flexShrink: 0, overflow: 'visible' }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes brewsp-p1{0%,100%{transform:rotate(0deg) translateY(0)}12%{transform:rotate(3deg) translateY(-3px)}26%{transform:rotate(-1.8deg) translateY(1.8px)}38%,95%{transform:rotate(0deg) translateY(0)}}
        @keyframes brewsp-p2{0%,4.7%,100%{transform:rotate(0deg) translateY(0)}17.6%{transform:rotate(5deg) translateY(-4px)}30.6%{transform:rotate(-3deg) translateY(2.4px)}43%,95%{transform:rotate(0deg) translateY(0)}}
        @keyframes brewsp-p3{0%,9.5%,100%{transform:rotate(0deg) translateY(0)}22.4%{transform:rotate(5deg) translateY(-4px)}35.4%{transform:rotate(-3deg) translateY(2.4px)}47.7%,95%{transform:rotate(0deg) translateY(0)}}
        @keyframes brewsp-p4{0%,14.2%,100%{transform:rotate(0deg) translateY(0)}27.1%{transform:rotate(4deg) translateY(-3px)}40.1%{transform:rotate(-2.4deg) translateY(1.8px)}52.4%,95%{transform:rotate(0deg) translateY(0)}}
        @keyframes brewsp-p5{0%,18.9%,100%{transform:rotate(0deg) translateY(0)}31.8%{transform:rotate(6deg) translateY(-5px)}44.8%{transform:rotate(-3.6deg) translateY(3px)}57.1%,95%{transform:rotate(0deg) translateY(0)}}
        @keyframes brewsp-grp{0%,78%,100%{transform:translateY(0)}84%{transform:translateY(-14px)}91%{transform:translateY(-2px)}96%{transform:translateY(0)}}
        .brewsp-p{transform-box:fill-box;transform-origin:center}
        .brewsp-p1{animation:brewsp-p1 3.8s ease-in-out infinite}
        .brewsp-p2{animation:brewsp-p2 3.8s ease-in-out infinite}
        .brewsp-p3{animation:brewsp-p3 3.8s ease-in-out infinite}
        .brewsp-p4{animation:brewsp-p4 3.8s ease-in-out infinite}
        .brewsp-p5{animation:brewsp-p5 3.8s ease-in-out infinite}
        .brewsp-grp{animation:brewsp-grp 3.8s ease-in-out infinite}
        @media(prefers-reduced-motion:reduce){.brewsp-p1,.brewsp-p2,.brewsp-p3,.brewsp-p4,.brewsp-p5,.brewsp-grp{animation:none!important}}
      `}</style>
      <g className="brewsp-grp">
        <circle className="brewsp-p brewsp-p1" fill="#333" cx="192.98" cy="911.28" r="167.53"/>
        <path className="brewsp-p brewsp-p2" fill="#ccc" d="M369.66,546.63c10.37,0,18.56,8.92,17.54,19.25-9.66,98.38-92.63,175.25-193.56,175.25S9.75,664.26.09,565.87c-1.01-10.32,7.17-19.25,17.54-19.25h352.03Z"/>
        <path className="brewsp-p brewsp-p3" fill="#f2f2f2" d="M305.18,268.09c7.43-7.43,19.69-6.76,26.22,1.46,53.35,67.08,49,164.98-13.06,227.04-62.05,62.05-159.95,66.4-227.04,13.06-8.22-6.54-8.88-18.8-1.46-26.22l215.32-215.32Z"/>
        <circle className="brewsp-p brewsp-p4" fill="#666" cx="185.79" cy="247.49" r="98.66"/>
        <g transform="translate(129.42 -148.17) rotate(45)">
          <rect className="brewsp-p brewsp-p5" fill="#7c3aed" x="180.34" y="18.9" width="126.47" height="126.47" rx="17.61" ry="17.61"/>
        </g>
      </g>
    </svg>
  );
}
