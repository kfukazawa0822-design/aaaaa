// ==========================================================================
// js/shop.js — ショップ画面
//
// 4カテゴリ構成：①応援（リスト形式）②スキル（横長1枠＋2列3段）
// ③カスタム（横長1枠＋2列3段）④博士支援（2列4段、横長枠なし）
//
// モード選択画面の「ショップ」ボタン → この画面を開く（コレクション画面と同じ、
// window.CollectionUIは使わずmode-selectを直接開閉する）。
//
// 【購入の実データ管理】
//   - 単発購入品（スキル／カスタム／博士支援／応援パック）: saveData.shopPurchases[id] = true
//   - スキル購入は追加でsaveData.unlockedSkillsにもidを積む（スキル選択画面がここを見る）
//   - エンドレスモード解放: saveData.endlessUnlocked
//   - アイコンガチャ: saveData.ownedIcons（重複無し、最大12でSOLD OUT）
//   - 無料応援パック: saveData.freePackClaimedDate（1日1回）
//
// 【まだ実装できていないこと（次のフェーズで対応）】
//   - 実際の課金決済／広告SDK連携（①ページの2商品は、現状「ダミーで即成功」扱い）
//   - カスタム購入品（エフェクト／玉スキン／機体スキン）の、実際の見た目切り替えUI
//     → 今回は「購入済みにする」ところまで。見た目に反映する仕組みは別途相談。
// ==========================================================================

(function(){
  function byId(id){
    const el = document.getElementById(id);
    if (!el) console.warn('[shop.js] 要素が見つかりません:', id);
    return el;
  }

  const modeSelect  = byId('mode-select');
  const shopScreen  = byId('shop-screen');
  const statusBar   = byId('player-status-bar');
  const doctorBubble = byId('shop-doctor-bubble');
  const categoryLabel = byId('shop-category-label');
  const grid        = byId('shop-grid');
  const dotsEl      = byId('shop-dots');
  const rewardOv    = byId('shop-reward-overlay');
  const rewardIcon  = byId('shop-reward-icon');
  const rewardName  = byId('shop-reward-name');
  const confirmOv    = byId('shop-confirm-overlay');
  const confirmText  = byId('shop-confirm-text');
  const confirmYesBtn = byId('shop-confirm-yes');
  const confirmNoBtn  = byId('shop-confirm-no');
  const errorOv = byId('shop-error-overlay');
  if (errorOv) errorOv.addEventListener('click', () => errorOv.classList.remove('show'));
  function showInsufficientEP(){
    if (errorOv) errorOv.classList.add('show');
  }

  const ICON_GACHA_POOL = Array.from({length:12}, (_,i) => `icon_${String(i+1).padStart(2,'0')}`);

  const SHOP_PAGES = [
    {
      id:'support', label:'応援', layout:'list',
      doctorLine:'生活用品も研究には必要なんじゃ。',
      items:[
        { id:'free_pack', name:'無料応援パック', kind:'free', icon:'🎁',
          desc:'動画の視聴でコインとバフを獲得できます。毎日1回受け取れます。',
          afterMsg:'おや？何やらエネルギーが活発化しているようじゃ。確認してきてくれ。' },
        { id:'paid_pack_1', name:'有料応援パック①', kind:'real_money', priceLabel:'390円', icon:'💳',
          desc:'広告を削除し、限定称号を獲得できます。',
          afterMsg:'（制作者より）ご購入ありがとうございます！あなたの応援が制作の励みになります。' },
        { id:'paid_pack_2', name:'有料応援パック②', kind:'real_money', priceLabel:'777円', icon:'💳',
          desc:'限定称号・限定アイコン・限定スキンを獲得できます。',
          afterMsg:'（制作者より）\nThank you.\nMerci.\nDanke.\nGracias.\nGrazie.\n감사합니다.\n谢谢.\n\n応援、本当にありがとうございます。マグネットボンバーを引き続きお楽しみください。' },
      ],
    },
    {
      id:'skill', label:'スキル', layout:'featured-grid',
      doctorLine:'ほれ、新しい装備じゃ！',
      items:[
        { id:'endless_unlock', name:'エンドレスモード解放', ep:100, originalEp:1100, kind:'endless_unlock', icon:'▶',
          desc:'エンドレスモードがプレイ可能になります。', featured:true },
        { id:'skill_shield',   name:'スキル：シールド',       ep:800,  kind:'skill', skillId:'shield',          icon:'🛡' },
        { id:'skill_typhoon',  name:'スキル：台風の目',       ep:1000, kind:'skill', skillId:'typhoon',         icon:'🌪' },
        { id:'skill_beacon',   name:'スキル：ワープビーコン', ep:1300, kind:'skill', skillId:'beacon',          icon:'🛰' },
        { id:'skill_dash',     name:'スキル：ダッシュ',       ep:1600, kind:'skill', skillId:'dash',            icon:'💨' },
        { id:'skill_cannon',   name:'スキル：大砲',           ep:2000, kind:'skill', skillId:'cannon',          icon:'💣' },
        { id:'skill_energy',   name:'スキル：エネルギー変換器', ep:2500, kind:'skill', skillId:'energyConverter', icon:'🔌' },
      ],
    },
    {
      id:'custom', label:'カスタム', layout:'featured-grid',
      doctorLine:'見た目にもこだわってみるかのう？',
      items:[
        { id:'icon_gacha',     name:'アイコンガチャ（1回）', ep:500,  kind:'icon_gacha', icon:'🎰',
          desc:'プロフィールで使用できるアイコンをランダムで1つ獲得します。', featured:true },
        { id:'explode_fx_1',   name:'爆発エフェクト①', ep:1200, kind:'cosmetic', icon:'💥' },
        { id:'explode_fx_2',   name:'爆発エフェクト②', ep:1200, kind:'cosmetic', icon:'💥' },
        { id:'marble_skin_1',  name:'玉スキン①',       ep:2000, kind:'cosmetic', icon:'🔮' },
        { id:'marble_skin_2',  name:'玉スキン②',       ep:2000, kind:'cosmetic', icon:'🔮' },
        { id:'player_skin_1',  name:'プレイヤー機体スキン①', ep:2000, kind:'cosmetic', icon:'🛸' },
        { id:'player_skin_2',  name:'プレイヤー機体スキン②', ep:2000, kind:'cosmetic', icon:'🛸' },
      ],
    },
    {
      id:'gift', label:'博士支援', layout:'grid',
      doctorLine:'差し入れは……いつでも歓迎じゃぞ。',
      items:[
        { id:'gift_ramen',   name:'カップラーメン',   ep:100,   kind:'gift', icon:'🍜',
          descBefore:'カップラーメンが食べたい気分じゃ。', descAfter:'これでいつでもラーメンが食べられるぞ！',
          afterMsg:'おぉ、これは助かる！腹が減っては研究は捗らぬからのう。' },
        { id:'gift_kettle',  name:'電気ケトル',       ep:300,   kind:'gift', icon:'♨️', desc:'博士へ電気ケトルを贈ります。',
          afterMsg:'徹夜ができるようになったのじゃ。' },
        { id:'gift_coffee',  name:'コーヒーメーカー', ep:600,   kind:'gift', icon:'☕', desc:'博士へコーヒーメーカーを贈ります。',
          afterMsg:'徹夜ができるようになったのじゃ。' },
        { id:'gift_microwave', name:'電子レンジ',     ep:1200,  kind:'gift', icon:'📡', desc:'博士へ電子レンジを贈ります。',
          afterMsg:'研究も料理も、温め直しは大事じゃ。' },
        { id:'gift_coat',    name:'新品の白衣',       ep:2500,  kind:'gift', icon:'🥼', desc:'博士へ新しい白衣を贈ります。',
          afterMsg:'新品の白衣は気持ちが引き締まるのう。' },
        { id:'gift_chair',   name:'オフィスチェア',   ep:4000,  kind:'gift', icon:'💺', desc:'博士へ新しいオフィスチェアを贈ります。',
          afterMsg:'これは良い……立ちたくなくなる椅子じゃ。' },
        { id:'gift_bed',     name:'ベッド',           ep:6000,  kind:'gift', icon:'🛏', desc:'博士へ新しいベッドを贈ります。',
          afterMsg:'これでぐっすり眠れる……3時間寝たら研究再開じゃ。' },
        { id:'gift_rocket',  name:'ロケット設計図',   ep:20000, kind:'gift', icon:'📜', desc:'博士の宇宙研究計画に必要な設計図です。',
          afterMsg:'……ありがとう。君のおかげで、夢に一歩近づいた。' },
      ],
    },
  ];

  let currentPage = 0;

  function todayStr(){
    const d = new Date();
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  }

  function isPurchased(item){
    if (item.kind === 'endless_unlock') return !!saveData.endlessUnlocked;
    if (item.kind === 'skill') return (saveData.unlockedSkills || []).includes(item.skillId);
    if (item.kind === 'free') return saveData.freePackClaimedDate === todayStr();
    if (item.kind === 'icon_gacha') return (saveData.ownedIcons || []).length >= ICON_GACHA_POOL.length;
    return !!(saveData.shopPurchases || {})[item.id];
  }

  function canAfford(item){
    return (playerProgress.coins || 0) >= item.ep;
  }

  function spendEP(amount){
    addCoins(-amount);
    if (typeof updatePlayerStatusBar === 'function') updatePlayerStatusBar();
  }

  function grantReward(item){
    if (item.kind === 'endless_unlock'){
      saveData.endlessUnlocked = true;
      if (typeof updateEndlessLockUI === 'function') updateEndlessLockUI();
    } else if (item.kind === 'skill'){
      if (!saveData.unlockedSkills) saveData.unlockedSkills = [];
      if (!saveData.unlockedSkills.includes(item.skillId)) saveData.unlockedSkills.push(item.skillId);
    } else if (item.kind === 'free'){
      saveData.freePackClaimedDate = todayStr();
      addCoins(50); // 無料パックの獲得コイン（バフ部分は今後の課題）
    } else if (item.kind === 'icon_gacha'){
      const owned = saveData.ownedIcons || (saveData.ownedIcons = []);
      const remaining = ICON_GACHA_POOL.filter(id => !owned.includes(id));
      const picked = remaining[Math.floor(Math.random() * remaining.length)];
      owned.push(picked);
      item._pickedIcon = picked; // ポップアップ表示用に一時保持
    } else {
      saveData.shopPurchases[item.id] = true;
    }
    if (typeof saveSaveData === 'function') saveSaveData();
  }

  function showRewardPopup(item, customName){
    if (!rewardOv) return;
    if (rewardIcon) rewardIcon.textContent = item.icon || '🎁';
    if (rewardName) rewardName.textContent = customName || item.name;
    rewardOv.classList.add('show');
  }
  if (rewardOv){
    rewardOv.addEventListener('click', () => rewardOv.classList.remove('show'));
  }

  function priceText(item){
    if (item.kind === 'real_money') return item.priceLabel;
    if (item.kind === 'endless_unlock') return `${item.ep}EP`;
    return `${item.ep}EP`;
  }

  function showConfirm(item, onYes){
    if (!confirmOv || !confirmText) { onYes(); return; }
    confirmText.textContent = `${item.name}を${priceText(item)}で購入しますか？`;
    confirmOv.classList.add('show');
    const cleanup = () => {
      confirmOv.classList.remove('show');
      confirmYesBtn.removeEventListener('click', onYesClick);
      confirmNoBtn.removeEventListener('click', onNoClick);
    };
    const onYesClick = () => { cleanup(); onYes(); };
    const onNoClick  = () => { cleanup(); };
    confirmYesBtn.addEventListener('click', onYesClick);
    confirmNoBtn.addEventListener('click', onNoClick);
  }

  function purchase(item){
    if (isPurchased(item)) return;

    if (item.kind === 'free'){
      // 無料受け取りは確認ポップを挟まずそのまま
      grantReward(item);
      showRewardPopup(item);
      renderGrid();
      return;
    }

    if (item.kind !== 'real_money' && !canAfford(item)) {
      showInsufficientEP();
      return;
    }

    showConfirm(item, () => executePurchase(item));
  }

  function executePurchase(item){
    if (item.kind === 'real_money'){
      // 実際の課金決済はまだ繋がっていないため、ダミーで即成功扱いにしている
      grantReward(item);
      showRewardPopup(item);
      renderGrid();
      return;
    }
    if (item.kind === 'icon_gacha'){
      if (!canAfford(item)) { showInsufficientEP(); return; }
      spendEP(item.ep);
      grantReward(item);
      showRewardPopup(item, `${item.name}：${item._pickedIcon}`);
      renderGrid();
      return;
    }
    // skill / cosmetic / gift / endless_unlock 共通
    if (!canAfford(item)) { showInsufficientEP(); return; }
    spendEP(item.ep);
    grantReward(item);
    showRewardPopup(item);
    renderGrid();
  }

  // ── エンドレスモード値引き購入（js/story.jsの購入チュートリアルステップから呼ばれる）。
  // 「今回だけ1100EP→100EPに値引き、確認は「はい」のみ」という演出込みの強制購入。
  // 通常のconfirm（はい/いいえ）は使わず、値引き価格を表示したまま自動的に購入を実行する。
  function runEndlessDiscountPurchase(onComplete){
    const def = SHOP_PAGES[1].items[0]; // エンドレスモード解放
    if (saveData.endlessUnlocked) { if (onComplete) onComplete(); return; }
    gotoPage(1);
    renderGrid();
    const spend = Math.min(def.ep, playerProgress.coins || 0);
    setTimeout(() => {
      if (spend > 0) spendEP(spend);
      grantReward(def);
      renderGrid(); // 購入済み状態（チェックマーク）を即座に反映
      showRewardPopup(def);
      if (onComplete) onComplete();
    }, 900); // 値引き表示を少し見せてから購入を実行する
  }

  function buildCardEl(item){
    const purchased = isPurchased(item);
    const card = document.createElement('div');
    card.className = 'shop-card' + (item.featured ? ' shop-card-featured' : '') + (purchased ? ' purchased' : '');

    let priceHtml;
    if (item.kind === 'real_money'){
      priceHtml = item.priceLabel;
    } else if (item.kind === 'free'){
      priceHtml = purchased ? '受取済み' : '無料';
    } else if (item.kind === 'endless_unlock'){
      priceHtml = purchased ? '購入済み' : `<span class="shop-price-strike">${item.originalEp}</span>${item.ep}EP`;
    } else if (item.kind === 'icon_gacha'){
      priceHtml = purchased ? 'SOLD OUT' : `${item.ep}EP`;
    } else {
      priceHtml = purchased ? '購入済み' : `${item.ep}EP`;
    }

    const desc = item.kind === 'gift' && item.descBefore
      ? (purchased ? item.descAfter : item.descBefore)
      : item.desc;

    card.innerHTML = `
      <div class="shop-card-icon">${item.icon || '🎁'}</div>
      <div class="shop-card-body">
        <div class="shop-card-name">${item.name}</div>
        ${desc && item.featured ? `<div class="shop-card-desc">${desc}</div>` : ''}
        <div class="shop-card-price">${priceHtml}</div>
      </div>
      ${purchased ? '<div class="shop-card-check">✔</div>' : ''}
    `;
    if (!purchased) {
      card.addEventListener('click', () => purchase(item));
    }
    return card;
  }

  function buildListCardEl(item){
    const purchased = isPurchased(item);
    const card = document.createElement('div');
    card.className = 'shop-card-list' + (purchased ? ' purchased' : '');
    const priceLabel = item.kind === 'real_money' ? item.priceLabel : (purchased ? '受取済み' : '無料');
    const btnLabel = purchased ? '受取済み' : (item.kind === 'free' ? '受け取る' : '購入する');
    card.innerHTML = `
      <div class="shop-card-list-top">
        <span class="shop-card-name">${item.icon || ''} ${item.name}</span>
        <span class="shop-card-price">${priceLabel}</span>
      </div>
      <div class="shop-card-desc">${item.desc}</div>
      <button class="shop-card-buy-btn" ${purchased ? 'disabled' : ''}>${btnLabel}</button>
    `;
    if (!purchased){
      card.querySelector('.shop-card-buy-btn').addEventListener('click', () => purchase(item));
    }
    return card;
  }

  function renderGrid(){
    if (!grid) return;
    const page = SHOP_PAGES[currentPage];
    if (categoryLabel) categoryLabel.textContent = `＞ ${page.label}`;
    if (doctorBubble) doctorBubble.textContent = page.doctorLine || '';
    grid.innerHTML = '';
    grid.classList.toggle('shop-grid-list', page.layout === 'list');
    for (const item of page.items){
      grid.appendChild(page.layout === 'list' ? buildListCardEl(item) : buildCardEl(item));
    }
  }

  function renderDots(){
    if (!dotsEl) return;
    dotsEl.innerHTML = '';
    SHOP_PAGES.forEach((p,i) => {
      const dot = document.createElement('button');
      dot.className = 'zukan-dot' + (i===currentPage ? ' active' : '');
      dot.title = p.label;
      dot.addEventListener('click', () => gotoPage(i));
      dotsEl.appendChild(dot);
    });
  }

  function gotoPage(i){
    currentPage = (i + SHOP_PAGES.length) % SHOP_PAGES.length;
    renderGrid();
    renderDots();
  }

  const prevBtn = byId('shop-prev');
  if (prevBtn) prevBtn.addEventListener('click', () => gotoPage(currentPage - 1));
  const nextBtn = byId('shop-next');
  if (nextBtn) nextBtn.addEventListener('click', () => gotoPage(currentPage + 1));

  function openShop(){
    if (!modeSelect || !shopScreen || !statusBar) return;
    modeSelect.classList.add('hide');
    shopScreen.classList.remove('hide');
    if (shopBackBtn) shopBackBtn.classList.remove('hide');
    statusBar.style.display = 'flex';
    if (typeof updatePlayerStatusBar === 'function') updatePlayerStatusBar();
    if (window.Achievements) window.Achievements.unlock('ach_002'); // ショップ機能解放の実績
    gotoPage(0);
    if (window.Story) window.Story.check('shop');
  }
  function closeShop(){
    if (!modeSelect || !shopScreen || !statusBar) return;
    shopScreen.classList.add('hide');
    if (shopBackBtn) shopBackBtn.classList.add('hide');
    modeSelect.classList.remove('hide');
    statusBar.style.display = '';
    if (window.Story) window.Story.check('mode_select');
  }

  const shopBackBtn = byId('shop-back');
  if (shopBackBtn){
    shopBackBtn.addEventListener('click', closeShop);
    shopBackBtn.addEventListener('touchstart', e=>{ e.preventDefault(); closeShop(); }, {passive:false});
  }

  window.ShopUI = { open: openShop, close: closeShop, runEndlessDiscountPurchase };
  console.log('[shop.js] 初期化完了。');
})();
