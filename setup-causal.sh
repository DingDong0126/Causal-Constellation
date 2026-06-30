<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cloud Studio - 云端开发，化繁为简</title>
  <style>
    body {
      margin: 0;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      flex-direction: column;
      background-color: #F0F4FA;
    }
    #error-code {
      color: var(--BlueGray-BlueGray10, #455267);
      text-align: center;
      font-family: "PingFang SC";
      font-size: 24px;
      font-style: normal;
      font-weight: 600;
      line-height: 22px;
      margin-bottom: 14px;
    }
    #error-message {
      color: var(--BlueGray-BlueGray10, #455267);
      text-align: center;
      font-family: "PingFang SC";
      font-size: 14px;
      font-style: normal;
      font-weight: 400;
      line-height: 22px;  
    }
  </style>
</head>
<body>
  <svg width="220" height="140" viewBox="0 0 220 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <mask id="mask0_0_9" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="140">
    <rect width="220" height="140" fill="#D9D9D9"/>
    </mask>
    <g mask="url(#mask0_0_9)">
    <g filter="url(#filter0_f_0_9)">
    <ellipse cx="110" cy="121.5" rx="28" ry="2.5" fill="#C1CEDE"/>
    </g>
    <circle cx="110" cy="64.0003" r="36.6182" transform="rotate(-22 110 64.0003)" fill="url(#paint0_linear_0_9)"/>
    <path d="M137.07 39.3281C148.706 37.653 156.986 38.8144 158.735 43.1421C161.9 50.9764 142.465 66.2161 115.325 77.1811C88.186 88.1461 63.6193 90.6842 60.4536 82.8504C58.7052 78.5227 63.8541 71.9356 73.3881 65.0571C73.433 66.619 73.5777 68.1879 73.8284 69.7547C69.4127 73.1981 67.1755 76.1507 67.9453 78.0562C69.8684 82.8118 89.7977 79.2448 112.46 70.0887C135.122 60.9326 151.936 49.6544 150.016 44.8977C149.246 42.9919 145.585 42.4228 140.015 43.0135C139.107 41.7124 138.122 40.4829 137.07 39.3281Z" fill="url(#paint1_linear_0_9)"/>
    <ellipse cx="108.073" cy="37.5001" rx="4.81818" ry="4.33636" fill="url(#paint2_linear_0_9)"/>
    <circle cx="86.8727" cy="67.8547" r="2.89091" fill="url(#paint3_linear_0_9)"/>
    <path d="M164.292 55L168.009 57.1459V61.4378L164.292 63.5837L160.575 61.4378V57.1459L164.292 55Z" fill="url(#paint4_linear_0_9)"/>
    <path d="M50.0043 48.0001L52.6061 49.5022V52.5065L50.0043 54.0087L47.4025 52.5065V49.5022L50.0043 48.0001Z" fill="url(#paint5_linear_0_9)"/>
    </g>
    <defs>
    <filter id="filter0_f_0_9" x="70" y="107" width="80" height="29" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
    <feFlood flood-opacity="0" result="BackgroundImageFix"/>
    <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
    <feGaussianBlur stdDeviation="6" result="effect1_foregroundBlur_0_9"/>
    </filter>
    <linearGradient id="paint0_linear_0_9" x1="98.7756" y1="37.3174" x2="147.751" y2="104.582" gradientUnits="userSpaceOnUse">
    <stop stop-color="#D8E4F4"/>
    <stop offset="1" stop-color="#B5C4D8"/>
    </linearGradient>
    <linearGradient id="paint1_linear_0_9" x1="56.0001" y1="90.5004" x2="168" y2="45.0004" gradientUnits="userSpaceOnUse">
    <stop stop-color="#CCD9EA"/>
    <stop offset="0.367566" stop-color="#DDE8F5"/>
    <stop offset="0.585268" stop-color="#DDE8F5"/>
    <stop offset="1" stop-color="#CBD9EB"/>
    </linearGradient>
    <linearGradient id="paint2_linear_0_9" x1="103.255" y1="39.1262" x2="114.633" y2="37.13" gradientUnits="userSpaceOnUse">
    <stop stop-color="#BECCDF"/>
    <stop offset="1" stop-color="#D9E5F5"/>
    </linearGradient>
    <linearGradient id="paint3_linear_0_9" x1="83.9818" y1="68.9387" x2="90.8477" y2="67.8547" gradientUnits="userSpaceOnUse">
    <stop stop-color="#BECCDF"/>
    <stop offset="1" stop-color="#D9E5F5"/>
    </linearGradient>
    <linearGradient id="paint4_linear_0_9" x1="159.062" y1="63.3679" x2="168.668" y2="54.7481" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FAB1E0"/>
    <stop offset="1" stop-color="#7688F9"/>
    </linearGradient>
    <linearGradient id="paint5_linear_0_9" x1="46.3436" y1="53.8576" x2="53.0676" y2="47.8237" gradientUnits="userSpaceOnUse">
    <stop stop-color="#FAB1E0"/>
    <stop offset="1" stop-color="#7688F9"/>
    </linearGradient>
    </defs>
  </svg>

  <div id="error-code">错误</div>
  <div id="error-message">未知错误，请稍后重试。</div>

  <script>
    var code = "12806";
    var message = "工作空间没有找到";
    var traceId = "7b88bf3a42de2a9166e3fe6836fb1d3e";

    if (code) {
      document.getElementById('error-code').textContent = `${code}`;
    }

    if (message) {
      document.getElementById('error-message').textContent = message;
    }

    if (window.parent) {
      window.parent.postMessage({
        type: 'cloudStudioError',
        code: code || 'Unknown',
        traceId: traceId || '',
        messages: message || '未知错误，请稍后重试。',
      }, '*');
    }
  </script>
</body>
<div style="position: fixed; bottom: 10px; right: 10px; font-size: 12px; color: #666; font-family: 'PingFang SC';">
    TraceId: 7b88bf3a42de2a9166e3fe6836fb1d3e
</div>
</html>
