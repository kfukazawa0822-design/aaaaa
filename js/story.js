// ==========================================================================
// js/story.js — 博士ストーリー／チュートリアル進行エンジン
//
// 「最初はクイックプレイと設定だけ解放。プレイして条件を満たすたびに、
//  博士との会話やチュートリアルポップを挟みながら機能を解放していく」
// という一連の流れを管理する。
//
// STORY_STEPS は上から順番に並んだ「次に見せるべきもの」のリスト。
// saveData.storyProgress.nextIndex が「次に判定すべきステップの番号（配列の添字）」。
// window.Story.check(context) を、機能の要所（モード選択画面に戻った時、
// ショップを開いた時、初回リザルト画面を閉じた時など）で呼ぶと、
//   1) 現在のnextIndexのステップのcontext条件・condition関数を確認
//   2) 満たしていればそのステップを表示（doctor/tutorialは複数ページをタップで送る）
//   3) ステップが完了したらnextIndexを進めて保存し、続けて次のステップも
//      即座に判定する（条件が既に満たされていれば連続で表示される）
// という流れで進む。
//
// 【ステップの種類】
//   doctor        : 画面下部の博士の吹き出し（#story-doctor-overlay）
//   tutorial      : 画面中央のチュートリアルカード（#story-tutorial-overlay）
//   name_input    : 名前入力ポップ（#story-name-overlay）
//   purchase_endless : ショップのエンドレスモード値引き強制購入
//                      （js/shop.js の window.ShopUI.runEndlessDiscountPurchase を呼ぶ）
//   skill_grant   : スキル獲得ポップ（#story-skill-grant-overlay）
//
// 【まだ差し込めていないもの（後日対応）】
//   - 博士の姿（#story-doctor-portrait-placeholder）
//   - チュートリアル画像（#story-tutorial-image-placeholder、元画像1000×800想定）
//   - チュートリアル本文（(ダミーテキスト)の箇所は仮の文章を入れてある）
//   どれも他ファイルの画像アセットと同じ考え方で、パスやテキストを
//   差し替えるだけで反映されるようにしてある。
// ==========================================================================

(function(){
  function byId(id){
    const el = document.getElementById(id);
    if (!el) console.warn('[story.js] 要素が見つかりません:', id);
    return el;
  }

  // ── ステップ定義 ──
  // 文中の {name} は、名前入力ステップで決めたプレイヤー名に置き換えられる。
  const STORY_STEPS = [
    { id:'greet1', type:'doctor', context:'mode_select', condition: () => true,
      pages: ['ようこそ。研究所になんの御用かな？わたしは博士。君の名前を伺ってもいいかな？'] },

    { id:'name_input', type:'name_input', context:null, condition: () => true },

    { id:'greet2', type:'doctor', context:null, condition: () => true,
      pages: [
        '{name}くん…あぁ！君がこの間応募してくれた子か。',
        'この研究所付近では未知の物質が取れる。わたしは【磁晶核】と名付けた。',
      ] },

    { id:'welcome_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'研究所へようこそ',
      pages: [
        { text:'（ダミーテキスト）この施設では、磁晶核という未知のエネルギー体を研究している。' },
        { text:'（ダミーテキスト）まずはクイックプレイで、実際に磁晶核に触れてみてほしい。' },
      ],
      effectsAfter: () => glowButton('mode-quick') },

    { id:'after_first_play', type:'doctor', context:'mode_select',
      condition: () => quickPlayCount() >= 1,
      pages: [
        'すばらしい！{name}助手くん。（才能あるね、物わかりが早いね的な褒め言葉）',
        'この調子で、沢山エネルギーを集めてきてほしい。これから宜しく頼むぞ。',
      ] },

    { id:'levelup_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'レベルアップに関して',
      pages: [ { text:'（ダミーテキスト）研究に貢献するとレベルが上がり、少しずつ出来ることが増えていく。' } ] },

    { id:'shop_intro', type:'doctor', context:'mode_select',
      condition: () => quickPlayCount() >= 3 && (typeof playerProgress !== 'undefined' ? playerProgress.coins : 0) >= 100,
      pages: ['研究をしているうちに、EPという物を手に入れてはいないか？それの使い道を説明しよう'] },

    { id:'shop_unlock_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'ショップ機能解放',
      pages: [ { text:'（ダミーテキスト）EPを使うと、ショップで色々なアイテムやスキルと交換できる。' } ],
      effectsAfter: () => {
        saveData.storyFlags.shopUnlocked = true;
        if (typeof saveSaveData === 'function') saveSaveData();
        if (typeof updateShopLockUI === 'function') updateShopLockUI();
        glowButton('mode-shop');
      } },

    { id:'shop_dialogue_1', type:'doctor', context:'shop', condition: () => true,
      pages: [
        'ここでは君のEPと引き換えにアイテムを考案できる場所じゃ',
        '君が集めてくれたEP（エネルギーポイント）はわたしに引き取らせてくれないか？',
        '早速エンドレスモードを解放してもらいたいんじゃ。。。今回は値引いて置くので購入してほしい。',
      ] },

    { id:'purchase_endless', type:'purchase_endless', context:null, condition: () => true },

    { id:'shop_dialogue_2', type:'doctor', context:null, condition: () => true,
      pages: ['ありがとう！エンドレスモードにはスキルを1つもっていける。これを受け取ってくれ。'] },

    { id:'skill_grant', type:'skill_grant', context:null, condition: () => true,
      skills:['ブリンク', '玉運動停止', 'マグネットスイープ'] },

    { id:'endless_tutorial', type:'tutorial', context:'mode_select', condition: () => true,
      titleBase:'エンドレスモード解放',
      pages: [
        { text:'（ダミーテキスト）エンドレスモードは、バッテリーが尽きるまで挑戦し続けられる。' },
        { text:'（ダミーテキスト）ショップについて、詳しく振り返っておこう。' },
        { text:'（ダミーテキスト）気になるスキルがあれば、ショップで集めてみてほしい。' },
      ],
      effectsAfter: () => glowButton('mode-endless') },
  ];

  function quickPlayCount(){
    return window.Achievements ? window.Achievements.getStatValue('quickPlayCount') : 0;
  }
  function playerName(){
    return (saveData.profile && saveData.profile.name) || '';
  }
  function fillTemplate(text){
    return text.replace(/\{name\}/g, playerName());
  }
  function glowButton(id){
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('story-glow');
    const clear = () => { el.classList.remove('story-glow'); el.removeEventListener('click', clear); };
    el.addEventListener('click', clear);
  }

  // ── 進行状態の読み書き ──
  function getProgress(){
    if (!saveData.storyProgress || typeof saveData.storyProgress !== 'object') {
      saveData.storyProgress = { nextIndex: 0 };
    }
    return saveData.storyProgress;
  }
  function persist(){
    if (typeof saveSaveData === 'function') saveSaveData();
  }

  let activePopupOpen = false; // 何らかのポップ表示中は多重発火を防ぐ
  let pageIndex = 0;

  function advance(){
    getProgress().nextIndex += 1;
    persist();
    activePopupOpen = false;
    // 続けて次のステップの条件も既に満たされているかもしれないので、同じcontextで再チェックする
    check(lastContext);
  }

  // ── 博士の吹き出し ──
  const doctorOv   = byId('story-doctor-overlay');
  const doctorText = byId('story-doctor-text');
  const doctorBubbleEl = byId('story-doctor-bubble');
  const doctorPortraitEl = byId('story-doctor-portrait');
  const doctorPortraitSpacer = byId('story-doctor-portrait-spacer');
  let doctorEntering = false; // 登場演出の2秒待ち中はタップで進めないようにするフラグ

  // 博士の姿（#story-doctor-portrait）は、ボイルキャンバスより上に出すため独立要素にしている。
  // レイアウト上の位置は#story-doctor-portrait-spacer（overlay内の透明な確保枠）に
  // ぴったり重なるよう、都度座標を synchronize する
  const DOCTOR_SAFE_MARGIN = 14; // 吹き出しを伸ばしても、これより画面端に近づけない
  const BUBBLE_BASE_PADDING_LEFT = 40; // CSSの元のpadding-left（30px）より少し右にテキストをずらす

  function syncDoctorPortraitPosition(){
    if (!doctorPortraitEl || !doctorPortraitSpacer || !doctorBubbleEl) return;

    // まず吹き出し側の拡張スタイルを一旦リセットして「自然な位置」を測り直す
    // （リサイズのたびに前回の拡張量が残ったまま計算すると、ズレが蓄積するため）
    doctorBubbleEl.style.marginLeft = '';
    doctorBubbleEl.style.width = '';
    doctorBubbleEl.style.paddingLeft = '';
    void doctorBubbleEl.offsetWidth; // 強制リフロー

    const spacerRect = doctorPortraitSpacer.getBoundingClientRect();
    doctorPortraitEl.style.left   = `${spacerRect.left}px`;
    doctorPortraitEl.style.top    = `${spacerRect.top}px`;
    doctorPortraitEl.style.width  = `${spacerRect.width}px`;
    doctorPortraitEl.style.height = `${spacerRect.height}px`;

    // 吹き出しの白背景を博士のエリアまで伸ばす。ただし画面端ギリギリまでは伸ばさない
    // （スマホの狭い画面で左にはみ出さないよう、実測した自然な位置をもとに安全な範囲に収める）
    const naturalRect = doctorBubbleEl.getBoundingClientRect();
    const desiredExtend = Math.max(0, naturalRect.left - spacerRect.left);
    const maxExtend = Math.max(0, naturalRect.left - DOCTOR_SAFE_MARGIN);
    const extend = Math.min(desiredExtend, maxExtend);
    if (extend > 0){
      doctorBubbleEl.style.marginLeft = `-${extend}px`;
      doctorBubbleEl.style.width = `calc(min(330px, 72vw) + ${extend}px)`;
      doctorBubbleEl.style.paddingLeft = `${BUBBLE_BASE_PADDING_LEFT + extend}px`;
    }
  }
  window.addEventListener('resize', () => {
    if (doctorPortraitEl && !doctorPortraitEl.classList.contains('hide')) syncDoctorPortraitPosition();
  });

  function showDoctorStep(step){
    pageIndex = 0;
    renderDoctorPage(step);
    if (doctorOv) doctorOv.classList.remove('hide');
    if (doctorPortraitEl) doctorPortraitEl.classList.remove('hide');
    syncDoctorPortraitPosition();
    // 画面はすぐ暗くする（＝#story-doctor-overlayが覆うことで背後のボタンは
    // タップできなくなる）が、吹き出し・ポートレート自体は2秒待ってから
    // 下からスライドインさせる
    if (doctorBubbleEl) doctorBubbleEl.classList.remove('slide-in');
    if (doctorPortraitEl) doctorPortraitEl.classList.remove('slide-in');
    doctorEntering = true;
    setTimeout(() => {
      doctorEntering = false;
      syncDoctorPortraitPosition(); // 直前でレイアウトが変わっている可能性があるので念のため再計算
      if (doctorBubbleEl) doctorBubbleEl.classList.add('slide-in');
      if (doctorPortraitEl) doctorPortraitEl.classList.add('slide-in');
      if (window.BoilFX && doctorBubbleEl) window.BoilFX.register(doctorBubbleEl);
    }, 1000);
  }
  function renderDoctorPage(step){
    if (doctorText) doctorText.textContent = fillTemplate(step.pages[pageIndex]);
  }
  function advanceDoctor(step){
    pageIndex++;
    if (pageIndex >= step.pages.length){
      if (doctorOv) doctorOv.classList.add('hide');
      if (doctorPortraitEl) doctorPortraitEl.classList.add('hide');
      if (doctorBubbleEl) doctorBubbleEl.classList.remove('slide-in');
      if (doctorPortraitEl) doctorPortraitEl.classList.remove('slide-in');
      if (window.BoilFX && doctorBubbleEl) window.BoilFX.unregister(doctorBubbleEl);
      advance();
    } else {
      renderDoctorPage(step);
    }
  }
  if (doctorOv){
    doctorOv.addEventListener('click', () => {
      if (doctorEntering) return; // 登場演出中はタップしても進めない
      const step = STORY_STEPS[getProgress().nextIndex];
      if (step && step.type === 'doctor') advanceDoctor(step);
    });
  }

  // ── チュートリアルカード ──
  const tutOv    = byId('story-tutorial-overlay');
  const tutCard  = byId('story-tutorial-card');
  const tutTitle = byId('story-tutorial-title');
  const tutText  = byId('story-tutorial-text');
  const tutImageWrap = byId('story-tutorial-image');
  const tutImagePlaceholder = byId('story-tutorial-image-placeholder');
  function showTutorialStep(step){
    pageIndex = 0;
    renderTutorialPage(step);
    if (tutOv) tutOv.classList.remove('hide');
    if (window.BoilFX && tutCard) window.BoilFX.register(tutCard);
    // 新しいステップが始まった瞬間だけ「ポヨン」と飛び出す演出を再生する
    // （既存のクラスを一度外して強制的にreflowさせないと、同じクラス名のままでは
    //   アニメーションが再トリガーされないため）
    if (tutCard){
      tutCard.classList.remove('pop-in');
      void tutCard.offsetWidth;
      tutCard.classList.add('pop-in');
    }
  }
  function renderTutorialPage(step){
    const page = step.pages[pageIndex];
    if (tutTitle) tutTitle.textContent = `${step.titleBase}（${pageIndex + 1}/${step.pages.length}）`;
    if (tutText) tutText.textContent = fillTemplate(page.text);
    if (tutImageWrap && tutImagePlaceholder){
      // pageに実画像(page.image)が設定されていればそちらを表示、無ければプレースホルダーのまま
      const existingImg = tutImageWrap.querySelector('img');
      if (existingImg) existingImg.remove();
      if (page.image){
        const img = document.createElement('img');
        img.src = page.image;
        img.onerror = () => { img.remove(); tutImagePlaceholder.style.display = ''; };
        img.onload  = () => { tutImagePlaceholder.style.display = 'none'; };
        tutImageWrap.appendChild(img);
      } else {
        tutImagePlaceholder.style.display = '';
      }
    }
  }
  function advanceTutorial(step){
    pageIndex++;
    if (pageIndex >= step.pages.length){
      if (tutOv) tutOv.classList.add('hide');
      if (window.BoilFX && tutCard) window.BoilFX.unregister(tutCard);
      if (step.effectsAfter) step.effectsAfter();
      advance();
    } else {
      renderTutorialPage(step);
    }
  }
  if (tutOv){
    tutOv.addEventListener('click', () => {
      const step = STORY_STEPS[getProgress().nextIndex];
      if (step && step.type === 'tutorial') advanceTutorial(step);
    });
  }

  // ── 名前入力ポップ ──
  const nameOv    = byId('story-name-overlay');
  const nameInput = byId('story-name-input');
  const nameSubmitBtn = byId('story-name-submit');
  function showNameInput(){
    if (nameInput) nameInput.value = '';
    if (nameOv) nameOv.classList.remove('hide');
    if (nameInput) setTimeout(() => nameInput.focus(), 50);
  }
  function submitName(){
    const val = (nameInput && nameInput.value.trim()) || '助手';
    if (!saveData.profile || typeof saveData.profile !== 'object') saveData.profile = {};
    saveData.profile.name = val;
    persist();
    if (nameOv) nameOv.classList.add('hide');
    advance();
  }
  if (nameSubmitBtn) nameSubmitBtn.addEventListener('click', submitName);
  if (nameInput) nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitName(); });

  // ── スキル獲得ポップ ──
  const skillOv   = byId('story-skill-grant-overlay');
  const skillList = byId('story-skill-grant-list');
  const skillClaimBtn = byId('story-skill-grant-claim-btn');
  const skillGrantPopupEl = byId('story-skill-grant-popup');
  function showSkillGrant(step){
    if (skillList) skillList.innerHTML = step.skills.map(s => `スキル：${s}`).join('<br>');
    if (skillOv) skillOv.classList.remove('hide');
    if (skillGrantPopupEl){
      skillGrantPopupEl.classList.remove('pop-in');
      void skillGrantPopupEl.offsetWidth;
      skillGrantPopupEl.classList.add('pop-in');
    }
  }
  if (skillClaimBtn){
    skillClaimBtn.addEventListener('click', () => {
      if (skillOv) skillOv.classList.add('hide');
      advance();
    });
  }

  // ── ステップ実行のディスパッチ ──
  function runStep(step){
    activePopupOpen = true;
    if (step.type === 'doctor')    return showDoctorStep(step);
    if (step.type === 'tutorial')  return showTutorialStep(step);
    if (step.type === 'name_input') return showNameInput();
    if (step.type === 'skill_grant') return showSkillGrant(step);
    if (step.type === 'purchase_endless'){
      if (window.ShopUI && window.ShopUI.runEndlessDiscountPurchase){
        window.ShopUI.runEndlessDiscountPurchase(() => advance());
      } else {
        advance(); // ショップ側の仕組みが無い場合は素通しして進める
      }
      return;
    }
    activePopupOpen = false;
  }

  let lastContext = null;

  // window.Story.check(context) — 機能の要所から呼ぶ進行チェック。
  // context: 'mode_select' | 'shop' | null（指定なしのステップはどのcontextからでも進む）
  function check(context){
    lastContext = context;
    if (activePopupOpen) return; // 何か表示中なら二重発火させない
    const idx = getProgress().nextIndex;
    const step = STORY_STEPS[idx];
    if (!step) return; // 用意されている分は全て終わった
    if (step.context && step.context !== context) return; // 想定の画面から呼ばれるまで待つ
    if (!step.condition()) return; // 条件未達
    runStep(step);
  }

  window.Story = { check };

  console.log('[story.js] 初期化完了。');
})();
