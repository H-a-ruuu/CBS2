// js/main.js — lightweight loader that fetches the original full HTML and injects its body and scripts
// This lets us keep index.html small while preserving the original app logic in the existing file.

const RAW_URL = 'https://raw.githubusercontent.com/H-a-ruuu/CBS2/52df5114012c17c20238a654ad76d21090f4b7d9/index.html';

async function fetchOriginalHtml() {
  const res = await fetch(RAW_URL);
  if (!res.ok) throw new Error('원본을 불러오지 못했습니다: ' + res.status);
  return await res.text();
}

function shouldSkipScriptSrc(src) {
  if (!src) return false;
  // skip tailwind/lucide duplicates because shell already loads them
  if (src.includes('cdn.tailwindcss.com')) return true;
  if (src.includes('unpkg.com/lucide')) return true;
  return false;
}

async function mountOriginal() {
  const container = document.getElementById('app-root');
  try {
    const htmlText = await fetchOriginalHtml();
    // parse
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // If the original has <style> in head, we've already copied styles to css/styles.css.
    // We'll focus on injecting the body content and executing scripts.

    // Inject body content
    const bodyHTML = doc.body ? doc.body.innerHTML : htmlText;
    container.innerHTML = bodyHTML;

    // Collect scripts from parsed doc and execute them in order
    const scripts = Array.from(doc.querySelectorAll('script'));

    for (const s of scripts) {
      const src = s.getAttribute('src');
      if (src && shouldSkipScriptSrc(src)) continue;

      await new Promise((resolve, reject) => {
        const scriptEl = document.createElement('script');
        if (src) {
          scriptEl.src = src;
          scriptEl.onload = resolve;
          scriptEl.onerror = () => reject(new Error('스크립트 로드 실패: ' + src));
          document.body.appendChild(scriptEl);
        } else {
          // inline script
          try {
            scriptEl.textContent = s.textContent;
            document.body.appendChild(scriptEl);
            resolve();
          } catch (err) {
            reject(err);
          }
        }
      });
    }

    // If the original expects a global `navigate` function from inline onclick attributes, ensure it exists.
    if (!window.navigate) {
      window.navigate = (view) => {
        // fallback: show/hide view elements if they exist in the injected body
        const allViews = document.querySelectorAll('[id^="view-"]');
        allViews.forEach(v => v.classList.add('hidden'));
        const target = document.getElementById('view-' + view);
        if (target) target.classList.remove('hidden');
      };
    }

    // re-run lucide icons for any inserted svg placeholders
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

  } catch (err) {
    console.error(err);
    container.innerHTML = '<div style="padding:16px;color:#900">앱 로드에 실패했습니다. 콘솔을 확인하세요.</div>';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  mountOriginal();
});
