// ==========================================================================
// js/zukan.js — 図鑑画面（研究対象／岩・ギミック／アイテム／スキル／見た目スキン／博士への差し入れ）
//
// 6カテゴリ × 12個（3×4マス）＝1カテゴリ=1ページ、合計6ページ構成。
// 左上のハンバーガーボタンでカテゴリ一覧の引き出しを開閉、下部の矢印/ドットでページ送り。
// マスを押すと詳細ポップを表示する（中身は未定なので今はプレースホルダー）。
//
// 画面の開閉自体は js/collection.js が公開している window.CollectionUI を使う。
// ※ 要素が見つからない場合は console.warn を出しつつ処理をスキップする
//   （collection.js と同じ方針。1箇所の欠落でスクリプト全体が止まらないようにするため）。
// ==========================================================================

(function(){
  function byId(id){
    const el = document.getElementById(id);
    if (!el) console.warn('[zukan.js] 要素が見つかりません:', id);
    return el;
  }

  const CATEGORIES = [
    { id:'matter',   label:'研究対象：物質X' },
    { id:'gimmick',  label:'岩・ギミック' },
    { id:'item',     label:'アイテム' },
    { id:'skill',    label:'スキル' },
    { id:'skin',     label:'見た目スキン' },
    { id:'gift',     label:'博士への差し入れ' },
  ];
  const ITEMS_PER_PAGE = 12;

  // 仮データ：各カテゴリ12個ぶん。名前・解放状態・アイコンは後日、本データに差し替える
  const ZUKAN_DATA = CATEGORIES.map(cat => ({
    ...cat,
    items: Array.from({length: ITEMS_PER_PAGE}, (_,i) => ({
      id: `${cat.id}_${i+1}`,
      name: `${cat.label} No.${i+1}`,
      unlocked: false,
      iconPath: null, // 決まったら 'assets/zukan/xxx.png' 等をここに
    })),
  }));

  let currentPage = 0;

  const screen      = byId('zukan-screen');
  const grid        = byId('zukan-grid');
  const dotsEl      = byId('zukan-dots');
  const drawer      = byId('zukan-drawer');
  const drawerOv    = byId('zukan-drawer-overlay');
  const drawerList  = byId('zukan-drawer-list');
  const popupOv     = byId('zukan-popup-overlay');
  const popupTitle  = byId('zukan-popup-title');
  const popupBody   = byId('zukan-popup-body');

  function renderDots(){
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    CATEGORIES.forEach((c,i) => {
      const dot = document.createElement('button');
      dot.className = 'zukan-dot' + (i===currentPage ? ' active' : '');
      dot.title = c.label;
      dot.addEventListener('click', () => gotoPage(i));
      dotsEl.appendChild(dot);
    });
  }

  function renderGrid(){
    if (!grid) return;
    grid.innerHTML = '';
    const cat = ZUKAN_DATA[currentPage];
    cat.items.forEach(item => {
      const cell = document.createElement('button');
      cell.className = 'zukan-cell' + (item.unlocked ? ' unlocked' : ' locked');
      if (item.iconPath){
        const img = document.createElement('img');
        img.className = 'zukan-cell-icon';
        img.src = item.iconPath;
        img.onerror = () => img.remove();
        cell.appendChild(img);
      }
      cell.addEventListener('click', () => openPopup(item));
      grid.appendChild(cell);
    });
  }

  function renderDrawerList(){
    if (!drawerList) return;
    drawerList.innerHTML = '';
    CATEGORIES.forEach((c,i) => {
      const row = document.createElement('div');
      row.className = 'zukan-drawer-item' + (i===currentPage ? ' current' : '');
      row.textContent = c.label;
      row.addEventListener('click', () => { gotoPage(i); closeDrawer(); });
      drawerList.appendChild(row);
    });
  }

  function gotoPage(i){
    currentPage = (i + CATEGORIES.length) % CATEGORIES.length;
    renderGrid();
    renderDots();
    renderDrawerList();
  }

  function openDrawer(){ if (drawer && drawerOv){ drawer.classList.add('open'); drawerOv.classList.add('show'); } }
  function closeDrawer(){ if (drawer && drawerOv){ drawer.classList.remove('open'); drawerOv.classList.remove('show'); } }

  function openPopup(item){
    if (!popupOv || !popupTitle || !popupBody) return;
    popupTitle.textContent = item.unlocked ? item.name : '？？？？？';
    popupBody.textContent = '詳細は後日追加されます。';
    popupOv.classList.add('show');
  }
  function closePopup(){ if (popupOv) popupOv.classList.remove('show'); }

  const menuBtn = byId('zukan-menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', openDrawer);
  const drawerCloseBtn = byId('zukan-drawer-close');
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closeDrawer);
  if (drawerOv) drawerOv.addEventListener('click', closeDrawer);

  const prevBtn = byId('zukan-prev');
  if (prevBtn) prevBtn.addEventListener('click', () => gotoPage(currentPage-1));
  const nextBtn = byId('zukan-next');
  if (nextBtn) nextBtn.addEventListener('click', () => gotoPage(currentPage+1));

  const popupCloseBtn = byId('zukan-popup-close');
  if (popupCloseBtn) popupCloseBtn.addEventListener('click', closePopup);
  if (popupOv) popupOv.addEventListener('click', e => { if (e.target === popupOv) closePopup(); });

  // コレクション画面の「図鑑」カード → この画面を開く
  const openZukan = () => {
    if (!window.CollectionUI){
      console.warn('[zukan.js] window.CollectionUI が未定義のため図鑑を開けません（js/collection.jsの初期化に失敗している可能性）');
      return;
    }
    if (!screen) return;
    window.CollectionUI.openSubscreen(screen);
    gotoPage(0);
  };
  const closeZukan = () => {
    closeDrawer(); closePopup();
    if (window.CollectionUI && screen) window.CollectionUI.closeSubscreen(screen);
  };
  const collectionZukanBtn = byId('collection-zukan');
  if (collectionZukanBtn){
    collectionZukanBtn.addEventListener('click', openZukan);
    collectionZukanBtn.addEventListener('touchstart', e=>{ e.preventDefault(); openZukan(); }, {passive:false});
  }
  const zukanBackBtn = byId('zukan-back');
  if (zukanBackBtn){
    zukanBackBtn.addEventListener('click', closeZukan);
    zukanBackBtn.addEventListener('touchstart', e=>{ e.preventDefault(); closeZukan(); }, {passive:false});
  }

  renderDrawerList();
  renderGrid();
  renderDots();
  console.log('[zukan.js] 初期化完了。');
})();
