// ==========================================================================
// js/collection.js — コレクション画面（プロフィール／チュートリアル／図鑑／実績称号）
//
// 中身（各項目を開いたときの詳細画面）は未実装。今回は入口となる4項目一覧画面と、
// モード選択画面との行き来だけを作っている。
//
// アイコン画像は js/assets.js の IMAGE_ASSET_PATHS.collection に登録したパスから
// 読み込む。ファイルがまだ無くても壊れず、その項目のアイコン欄が空くだけになる
// （<img>のonerrorで自動的に非表示にする）。
//
// ※ 全てのdocument.getElementById呼び出しにnullチェックを入れている。
//   理由：どこか1箇所でも要素が見つからずエラーになると、このIIFE全体がそこで
//   停止してしまい、後続の処理（tutorial/achievement一覧の生成や、末尾の
//   window.CollectionUI の公開）が丸ごと実行されなくなる。特にCollectionUIが
//   未定義のままだと、js/zukan.js側の画面遷移が静かに機能しなくなるため、
//   要素が見つからない場合はconsole.warnで知らせつつ、その処理だけスキップして
//   スクリプト全体は最後まで実行されるようにしている。
// ==========================================================================

(function(){
  function byId(id){
    const el = document.getElementById(id);
    if (!el) console.warn('[collection.js] 要素が見つかりません:', id);
    return el;
  }

  // 各カードの <img class="collection-card-icon"> に、対応するアセットパスを設定する
  function loadCollectionIcons(){
    if (typeof IMAGE_ASSET_PATHS === 'undefined' || !IMAGE_ASSET_PATHS.collection) return;
    const map = {
      'collection-profile':      'profile',
      'collection-tutorial':     'tutorial',
      'collection-zukan':        'zukan',
      'collection-achievements': 'achievements',
    };
    for (const cardId in map){
      const card = document.getElementById(cardId);
      if (!card) continue;
      const img = card.querySelector('.collection-card-icon');
      const path = IMAGE_ASSET_PATHS.collection[map[cardId]];
      if (!img || !path) continue;
      img.onerror = () => { img.removeAttribute('src'); };
      img.src = path;
    }
  }
  loadCollectionIcons();

  // ── 画面遷移 ──
  const modeSelect  = byId('mode-select');
  const collection  = byId('collection-screen');
  const statusBar   = byId('player-status-bar');

  function openCollection(){
    if (!modeSelect || !collection || !statusBar) return;
    modeSelect.classList.add('hide');
    collection.classList.remove('hide');
    // #player-status-barは通常「#mode-selectが表示中のときだけ表示」というCSSの隣接セレクタで
    // 制御されているため、コレクション画面でも表示し続けたい場合はここでJS側から明示的に上書きする
    // （インラインstyleはCSSのセレクタより優先される）
    statusBar.style.display = 'flex';
    if (typeof updatePlayerStatusBar === 'function') updatePlayerStatusBar();
  }
  function closeCollection(){
    if (!modeSelect || !collection || !statusBar) return;
    collection.classList.add('hide');
    modeSelect.classList.remove('hide');
    statusBar.style.display = ''; // 上書きを解除し、通常のCSS制御に戻す
  }

  // モード選択画面のコレクションボタン → コレクション画面を開く
  const modeCollectionBtn = document.getElementById('mode-collection');
  if (modeCollectionBtn){
    modeCollectionBtn.addEventListener('click', openCollection);
    modeCollectionBtn.addEventListener('touchstart', e=>{ e.preventDefault(); openCollection(); }, {passive:false});
  } else {
    console.warn('[collection.js] 要素が見つかりません: mode-collection');
  }

  const backBtn = byId('collection-to-mode');
  if (backBtn){
    backBtn.addEventListener('click', closeCollection);
    backBtn.addEventListener('touchstart', e=>{ e.preventDefault(); closeCollection(); }, {passive:false});
  }

  // ── サブ画面（チュートリアル一覧・実績称号一覧・図鑑）共通の開閉処理 ──
  // コレクション画面の4項目とは違い、こちらは上部ステータスバーを非表示にして使う
  function openSubscreen(screenEl){
    if (!collection || !statusBar || !screenEl) return;
    collection.classList.add('hide');
    screenEl.classList.remove('hide');
    statusBar.style.display = 'none';
  }
  function closeSubscreen(screenEl){
    if (!collection || !statusBar || !screenEl) return;
    screenEl.classList.add('hide');
    collection.classList.remove('hide');
    statusBar.style.display = 'flex'; // コレクション画面はステータスバーを表示するのでflexに戻す
  }

  // ── チュートリアル一覧 ──
  const TUTORIAL_ITEMS = Array.from({length:20}, (_,i) => ({
    no: String(i+1).padStart(3,'0'),
    title: 'チュートリアルタイトル（仮）',
  }));

  const tutorialScreen = document.getElementById('tutorial-screen');
  const tutorialList   = byId('tutorial-list');
  if (tutorialList){
    TUTORIAL_ITEMS.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'tutorial-card';
      card.innerHTML = `<div class="tutorial-card-no">No.${item.no}</div><div class="tutorial-card-title">${item.title}</div>`;
      card.addEventListener('click', () => {
        // TODO: 実際のポップ内容が決まったら、ここでその内容を表示する処理を呼ぶ
        console.log('チュートリアル', item.no, 'を開く（未実装）');
      });
      tutorialList.appendChild(card);
    });
  }

  const collectionTutorialBtn = byId('collection-tutorial');
  const tutorialBackBtn = byId('tutorial-back');
  if (collectionTutorialBtn && tutorialScreen){
    collectionTutorialBtn.addEventListener('click', () => openSubscreen(tutorialScreen));
    collectionTutorialBtn.addEventListener('touchstart', e=>{ e.preventDefault(); openSubscreen(tutorialScreen); }, {passive:false});
  }
  if (tutorialBackBtn && tutorialScreen){
    tutorialBackBtn.addEventListener('click', () => closeSubscreen(tutorialScreen));
    tutorialBackBtn.addEventListener('touchstart', e=>{ e.preventDefault(); closeSubscreen(tutorialScreen); }, {passive:false});
  }

  // ── 実績称号一覧 ──
  const ACHIEVEMENT_ITEMS = Array.from({length:20}, (_,i) => ({
    unlocked: i % 4 !== 2 && i % 4 !== 3,
    title: '称号名（仮）',
    desc: '称号の説明文が入ります（仮）。',
    date: '2026/07/10',
    level: 18,
    condition: '達成条件が入ります（仮）。',
  }));

  const achievementScreen = document.getElementById('achievement-screen');
  const achievementList   = byId('achievement-list');
  if (achievementList){
    ACHIEVEMENT_ITEMS.forEach(item => {
      const card = document.createElement('div');
      if (item.unlocked){
        card.className = 'achv-card unlocked';
        card.innerHTML = `
          <div class="achv-title">${item.title}</div>
          <div class="achv-desc">${item.desc}</div>
          <div class="achv-meta">取得日：${item.date}　取得Lv：${item.level}</div>`;
      } else {
        card.className = 'achv-card locked';
        card.innerHTML = `
          <div class="achv-title">？？？？？</div>
          <div class="achv-desc">${item.condition}</div>`;
      }
      achievementList.appendChild(card);
    });
  }

  const collectionAchievementsBtn = byId('collection-achievements');
  const achievementBackBtn = byId('achievement-back');
  if (collectionAchievementsBtn && achievementScreen){
    collectionAchievementsBtn.addEventListener('click', () => openSubscreen(achievementScreen));
    collectionAchievementsBtn.addEventListener('touchstart', e=>{ e.preventDefault(); openSubscreen(achievementScreen); }, {passive:false});
  }
  if (achievementBackBtn && achievementScreen){
    achievementBackBtn.addEventListener('click', () => closeSubscreen(achievementScreen));
    achievementBackBtn.addEventListener('touchstart', e=>{ e.preventDefault(); closeSubscreen(achievementScreen); }, {passive:false});
  }

  // 他のコレクション系ファイル（js/zukan.js など）から同じ開閉処理を使えるように公開
  window.CollectionUI = { openSubscreen, closeSubscreen };
  console.log('[collection.js] 初期化完了。window.CollectionUI を公開しました。');
})();
