(function () {
  const root = document.getElementById('groupes');
  if (!root) return;
  const form = root.closest('form');
  const tplGroupe = document.getElementById('tpl-groupe');
  const tplOption = document.getElementById('tpl-option');
  const fileInput = form.querySelector('input[type=file][name=image]');
  const hasImage = form.querySelector('input[name=__hasImage]');

  const groupes = () => [...root.querySelectorAll(':scope > [data-groupe]')];
  const optionsOf = (g) => [...g.querySelectorAll('[data-option]')];

  function reindex() {
    groupes().forEach((g, i) => {
      g.querySelectorAll('[data-gfield]').forEach((el) => (el.name = `groupes[${i}][${el.dataset.gfield}]`));
      optionsOf(g).forEach((o, j) => {
        o.querySelectorAll('[data-ofield]').forEach(
          (el) => (el.name = `groupes[${i}][options][${j}][${el.dataset.ofield}]`)
        );
      });
    });
  }
  function refresh() {
    reindex();
    const gs = groupes();
    gs.forEach((g, i) => {
      const opts = optionsOf(g);
      const n = opts.length;
      const max = parseInt(g.querySelector('[data-gfield=max]').value, 10);

      g.querySelector('[data-live=single]').hidden = n !== 1;
      const liveMax = g.querySelector('[data-live=max]');
      if (Number.isInteger(max) && max > n) {
        liveMax.textContent = `Le maximum (${max}) dépasse le nombre d'options (${n})`;
        liveMax.hidden = false;
      } else if (!liveMax.dataset.server) {
        liveMax.hidden = true;
      }
      const chosen = opts.map((o) => o.querySelector('[data-ofield=produit]').value).filter(Boolean);
      opts.forEach((o) => {
        const sel = o.querySelector('[data-ofield=produit]');
        [...sel.options].forEach((opt) => {
          opt.disabled = !!opt.value && opt.value !== sel.value && chosen.includes(opt.value);
        });
        o.querySelector('[data-action=remove-option]').disabled = n <= 1;
      });

      g.querySelector('[data-action=up]').disabled = i === 0;
      g.querySelector('[data-action=down]').disabled = i === gs.length - 1;
      g.querySelector('[data-action=remove-group]').disabled = gs.length <= 1;
    });
  }
  function addGroup() {
    root.appendChild(tplGroupe.content.cloneNode(true));
    refresh();
  }
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const g = btn.closest('[data-groupe]');
    switch (btn.dataset.action) {
      case 'add-group':
        addGroup();
        break;
      case 'remove-group':
        if (groupes().length > 1) g.remove();
        break;
      case 'up': {
        const prev = g.previousElementSibling;
        if (prev && prev.hasAttribute('data-groupe')) root.insertBefore(g, prev);
        break;
      }
      case 'down': {
        const next = g.nextElementSibling;
        if (next && next.hasAttribute('data-groupe')) next.after(g);
        break;
      }
      case 'add-option':
        g.querySelector('[data-options]').appendChild(tplOption.content.cloneNode(true));
        break;
      case 'remove-option':
        if (optionsOf(g).length > 1) btn.closest('[data-option]').remove();
        break;
      default:
        return;
    }
    refresh();
  });

  form.addEventListener('input', refresh);
  form.addEventListener('change', refresh);
  if (fileInput && hasImage) {
    fileInput.addEventListener('change', () => (hasImage.value = fileInput.files.length ? '1' : '0'));
  }
  root.querySelectorAll('[data-live=max]').forEach((el) => {
    if (!el.hidden) el.dataset.server = '1';
  });
  refresh();
})();
