// Tiny markdown to HTML (subset) without dependencies
export function mdToHtml(md){
  if (!md) return '';
  const esc = (s)=> s.replace(/[&<>]/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const lines = md.split(/\r?\n/);
  let out = [];
  let inCode = false;
  for (let line of lines){
    if (line.startsWith('```')){ inCode = !inCode; out.push(inCode?'<pre><code>':'</code></pre>'); continue; }
    if (inCode){ out.push(esc(line)); continue; }
    if (/^#\s+/.test(line)) out.push(`<h1>${esc(line.replace(/^#\s+/,''))}</h1>`);
    else if (/^##\s+/.test(line)) out.push(`<h2>${esc(line.replace(/^##\s+/,''))}</h2>`);
    else if (/^###\s+/.test(line)) out.push(`<h3>${esc(line.replace(/^###\s+/,''))}</h3>`);
    else if (/^\s*[-*]\s+/.test(line)) out.push(`<li>${esc(line.replace(/^\s*[-*]\s+/,''))}</li>`);
    else if (/^\s*$/.test(line)) out.push('');
    else out.push(`<p>${inline(line)}</p>`);
  }
  // wrap consecutive <li> into <ul>
  const joined = out.join('\n');
  const ul = joined.replace(/(?:^|\n)(<li>.*?<\/li>)(?:\n(?!<h\d|<p|<pre|$)<li>.*?<\/li>)*?/gs, (m)=>`<ul>${m.replace(/\n/g,'')}</ul>`);
  return ul;
}

function inline(text){
  // basic inline formatting: **bold**, *italic*, code `x`, links [t](u), images ![a](u)
  let s = text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  return s;
}
