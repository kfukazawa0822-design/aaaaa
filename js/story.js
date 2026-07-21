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
// 【contextの一覧】（いただいたストーリー設計表 No.001〜043 に対応）
//   null           : どの画面からでも進む（直前のステップに連続して表示する場合など）
//   'mode_select'  : モード選択画面に戻った時
//   'shop'         : ショップ画面を開いた時
//   'item_pickup'      : ゲームプレイ中、アイテムを取得した瞬間（index.html:applyItem）
//   'skill_purchased'  : ショップでスキルを購入した瞬間（js/shop.js:grantReward→報酬ポップを閉じた時）
//   'free_pack_claimed': ショップで無料応援パックを受け取った瞬間（js/shop.js:同上）
//   'profile_open'     : プロフィール画面を開いた瞬間（js/profile.js:openProfile）
//   'tutorial_open'    : チュートリアル一覧画面を開いた瞬間（js/collection.js:openTutorialScreen）
//   'achievement_open' : 実績称号一覧画面を開いた瞬間（js/collection.js:openAchievementScreen）
//   'zukan_open'       : 図鑑画面を開いた瞬間（js/zukan.js:openZukan）
//   → お送りいただいたjs/shop.js・js/profile.js・js/collection.js・js/zukan.jsに
//     全てフックを追加済み。
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
  //
  // 【いただいたストーリー設計表（No.001〜043）との対応】
  // 表のNo.をコメントで付記している。表の「種類」列がそのままtypeに対応する
  // （博士ストーリー→doctor、チュートリアル→tutorial、プレイヤー操作→name_input/
  //  purchase_endless/skill_grantなど個別のtype）。
  //
  const STORY_STEPS = [
    // No.001 博士ストーリー：はじめまして（1/3）
    { id:'greet1', type:'doctor', context:'mode_select', condition: () => true,
      pages: ['ようこそ。研究所になんの御用かな？わたしは博士。君の名前を伺ってもいいかな？'] },

    // No.002 プレイヤー操作：名前入力ポップアップ
    { id:'name_input', type:'name_input', context:null, condition: () => true },

    // No.003-004 博士ストーリー：はじめまして（2/3）（3/3）
    { id:'greet2', type:'doctor', context:null, condition: () => true,
      pages: [
        '{name}くん…あぁ！君がこの間応募してくれた子か。',
        'この研究所付近では未知の物質が取れる。わたしは【磁晶核】と名付けた。',
      ] },

    // No.005-007 チュートリアル：研究所へようこそ（1/3〜3/3）
    { id:'welcome_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'研究所へようこそ',
      pages: [
        { text:'（ダミーテキスト）舞台の設定' },
        { text:'（ダミーテキスト）磁晶核とは' },
        { text:'（ダミーテキスト）操作方法' },
      ],
      effectsAfter: () => glowButton('mode-quick') },

    // No.008 チュートリアル：アイテムに関して（初アイテム獲得時／ゲームプレイ中に一時停止して表示）
    // ※このステップだけ画面下部の博士ではなく、ゲームプレイ中に中央のチュートリアルカードとして
    //   割り込み表示する想定。表示中はgamePausedをtrueにして、裏でボールが動き続けないようにしている。
    { id:'first_item_tutorial', type:'tutorial', context:'item_pickup', condition: () => true,
      titleBase:'アイテムに関して',
      pages: [ { text:'（ダミーテキスト）アイテムに関して' } ],
      pauseGame:true },

    // No.009-010 博士ストーリー：初プレイ後（1/2）（2/2）
    // ※初回プレイのみリザルト画面の選択肢が「完了」1択になる処理は、index.html側の
    //   goCompleteFirstPlay関連で既に実装済み（このファイルでの対応は不要）。
    { id:'after_first_play', type:'doctor', context:'mode_select',
      condition: () => quickPlayCount() >= 1,
      pages: [
        'すばらしい！{name}助手くん。（才能あるね、物わかりが早いね的な褒め言葉）',
        'この調子で、沢山エネルギーを集めてきてほしい。これから宜しく頼むぞ。',
      ] },

    // No.011 チュートリアル：ガラス玉の種類（011〜013は表のタイトルに(x/y)表記が無いため、
    // 3つとも別々のタイトルを持つ独立したチュートリアルカードとして扱っている）
    { id:'tips_marble', type:'tutorial', context:null, condition: () => true,
      titleBase:'ガラス玉の種類',
      pages: [ { text:'（ダミーテキスト）' } ] },

    // No.012 チュートリアル：岩の種類
    { id:'tips_rock', type:'tutorial', context:null, condition: () => true,
      titleBase:'岩の種類',
      pages: [ { text:'（ダミーテキスト）' } ] },

    // No.013 チュートリアル：レベルアップに関して
    { id:'levelup_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'レベルアップに関して',
      pages: [ { text:'（ダミーテキスト）研究に貢献するとレベルが上がり、少しずつ出来ることが増えていく。' } ] },

    // No.014 博士ストーリー：ショップ開放
    { id:'shop_intro', type:'doctor', context:'mode_select',
      condition: () => quickPlayCount() >= 3 && (typeof playerProgress !== 'undefined' ? playerProgress.coins : 0) >= 100,
      pages: ['研究をしているうちに、EPという物を手に入れてはいないか？それの使い道を説明しよう'] },

    // No.015 チュートリアル：EPの使い道
    { id:'ep_usage_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'EPの使い道',
      pages: [ { text:'（ダミーテキスト）' } ] },

    // No.016 チュートリアル：ショップ機能解放（閲覧後にショップボタンを解放して発光させる）
    { id:'shop_unlock_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'ショップ機能解放',
      pages: [ { text:'（ダミーテキスト）EPを使うと、ショップで色々なアイテムやスキルと交換できる。' } ],
      effectsAfter: () => {
        saveData.storyFlags.shopUnlocked = true;
        if (typeof saveSaveData === 'function') saveSaveData();
        if (typeof updateShopLockUI === 'function') updateShopLockUI();
        glowButton('mode-shop');
      } },

    // No.017-019 博士ストーリー：ショップチュートリアル（1/4〜3/4）
    { id:'shop_dialogue_1', type:'doctor', context:'shop', condition: () => true,
      pages: [
        'ここでは君のEPと引き換えにアイテムを考案できる場所じゃ',
        '君が集めてくれたEP（エネルギーポイント）はわたしに引き取らせてくれないか？',
        '早速エンドレスモードを解放してもらいたいんじゃ。。。今回は値引いて置くので購入してほしい。',
      ] },

    // No.020 プレイヤー操作：購入チュートリアル（値引き演出→確認ポップ→購入後ポップ）
    { id:'purchase_endless', type:'purchase_endless', context:null, condition: () => true },

    // No.021 博士ストーリー：ショップチュートリアル（4/4）
    { id:'shop_dialogue_2', type:'doctor', context:null, condition: () => true,
      pages: ['ありがとう！エンドレスモードにはスキルを1つもっていける。これを受け取ってくれ。'] },

    // No.022 プレイヤー操作：スキル受け取り
    { id:'skill_grant', type:'skill_grant', context:null, condition: () => true,
      skills:['ブリンク', '玉運動停止', 'マグネットスイープ'] },

    // No.023 チュートリアル：エンドレスモード解放・バッテリー
    { id:'endless_battery_tutorial', type:'tutorial', context:'mode_select', condition: () => true,
      titleBase:'エンドレスモード解放・バッテリー',
      pages: [ { text:'（ダミーテキスト）バッテリー追加で運が良ければ無限にできる' } ] },

    // No.024 チュートリアル：スキルについて
    { id:'endless_skill_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'スキルについて',
      pages: [ { text:'（ダミーテキスト）' } ] },

    // No.025 チュートリアル：エンドレスモード限定ギミック（閲覧後にエンドレスボタンを発光）
    { id:'endless_gimmick_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'エンドレスモード限定ギミック',
      pages: [ { text:'（ダミーテキスト）' } ],
      effectsAfter: () => glowButton('mode-endless') },

    // No.026 チュートリアル：このゲームの定石（レベル15を目指そう）（エンドレス初クリア後）
    // 「endlessPlayCount」統計値は、index.html側（リザルト集計処理）にquickPlayCountと
    // 同じパターンで新設した。20秒未満のプレイはカウントしない点もquickPlayCountに合わせている。
    { id:'lv15_goal_tutorial', type:'tutorial', context:'mode_select',
      condition: () => endlessPlayCount() >= 1,
      titleBase:'このゲームの定石（レベル15を目指そう）',
      pages: [ { text:'（ダミーテキスト）Lv.15まで進めよう' } ] },

    // No.027 チュートリアル：ショップ：新商品が追加されました！（Lv15達成、1・2ページ目解放）
    // ショップ側の「ページ数によって表示するアイテムを絞る」ロジックはjs/shop.js側に実装済み
    // （SHOP_PAGESの各ページのminPagesUnlockedと、この値を見比べてシャッターを出し分けている）。
    { id:'lv15_shop_new_tutorial', type:'tutorial', context:'mode_select',
      condition: () => playerLevel() >= 15,
      titleBase:'ショップ：新商品が追加されました！',
      pages: [ { text:'ショップ：限定パック・スキル画面（1・2ページ目）解放' } ],
      effectsAfter: () => {
        saveData.storyFlags.shopPagesUnlocked = Math.max(saveData.storyFlags.shopPagesUnlocked || 1, 2);
        if (typeof saveSaveData === 'function') saveSaveData();
        addBadge('mode-shop');
      } },

    // No.028-029 博士ストーリー：実質ショップ機能解放（1/2）（2/2）（ショップボタンに赤バッジ）
    // ※No.029の説明欄は空欄だったため、話の流れが繋がるよう仮のセリフを入れている。
    { id:'lv15_shop_doctor', type:'doctor', context:null, condition: () => true,
      pages: [
        'ショップシステムを構築して、早速スキルの開発を行ったぞ',
        '（ダミーテキスト）これでスキルや限定アイテムをどんどん充実させていけそうじゃ。',
      ] },

    // No.030「お気に入りスキルに関して」・No.031「バフに関して」は、それぞれ
    // 「スキルを買ったら」「無料パックを受け取ったら」という、プレイヤーが必ずしも
    // やるとは限らない行動が条件になっている。これをこのメインの順番待ち列に
    // そのまま入れてしまうと、その行動をまだしていないプレイヤーは、Lv20やLv30などの
    // 後続のステップが（条件を満たしていても）ずっと表示されなくなってしまう
    // （このバグが実際に起きていた：Lv20達成してもコレクションが解放されない）。
    // そのため、この2つは下のSIDE_STEPSという別枠に移動し、メインの順番とは無関係に
    // 条件を満たした時だけ割り込みで表示されるようにした。

    // No.032-033 博士ストーリー：コレクション解放（1/2）（2/2）（Lv20達成）
    // ※説明欄が空欄だったため、仮のセリフを入れている。
    { id:'lv20_collection_doctor', type:'doctor', context:'mode_select',
      condition: () => playerLevel() >= 20,
      pages: [
        '（ダミーテキスト）そういえば、今まで集めた記録をまとめる場所がまだ無かったな。',
        '（ダミーテキスト）コレクション機能を用意した。好きな時に見てみるといい。',
      ] },

    // No.034-035 チュートリアル：コレクション解放（1/2）（2/2）（閲覧後にコレクションボタン解放・発光）
    { id:'collection_unlock_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'コレクション解放',
      pages: [
        { text:'（ダミーテキスト）' },
        { text:'（ダミーテキスト）' },
      ],
      effectsAfter: () => {
        saveData.storyFlags.collectionUnlocked = true;
        if (typeof saveSaveData === 'function') saveSaveData();
        if (typeof updateCollectionLockUI === 'function') updateCollectionLockUI();
        glowButton('mode-collection');
      } },

    // No.036〜038「初めてプロフィール／チュートリアル／実績称号を開いた」の3つも、
    // favorite_skill_tutorial/buff_tutorialと全く同じ理由（プレイヤーが必ずしも
    // その画面を開くとは限らない）で、下のSIDE_STEPSに移動した。

    // No.039 博士ストーリー：図鑑説明とショップおまけ（Lv30達成）
    { id:'lv30_doctor', type:'doctor', context:'mode_select',
      condition: () => playerLevel() >= 30,
      pages: [ 'だいぶ色々研究でわかってきたんじゃない？的な' ] },

    // No.040 チュートリアル：ショップ：新商品が追加されました！（Lv30、3・4ページ目解放、赤バッジ）
    { id:'lv30_shop_new_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'ショップ：新商品が追加されました！',
      pages: [ { text:'（3・4ページ目）解放' } ],
      effectsAfter: () => {
        saveData.storyFlags.shopPagesUnlocked = Math.max(saveData.storyFlags.shopPagesUnlocked || 1, 4);
        if (typeof saveSaveData === 'function') saveSaveData();
        addBadge('mode-shop');
      } },

    // No.041 チュートリアル：コレクション：図鑑が解放されました！（コレクションに赤バッジ・図鑑ボタン発光）
    { id:'lv30_zukan_unlock_tutorial', type:'tutorial', context:null, condition: () => true,
      titleBase:'コレクション：図鑑が解放されました！',
      pages: [ { text:'ここでスキン着脱（1番最初のページに図鑑進捗とカスタムページを入れる）' } ],
      effectsAfter: () => {
        saveData.storyFlags.zukanUnlocked = true;
        if (typeof saveSaveData === 'function') saveSaveData();
        if (typeof updateZukanLockUI === 'function') updateZukanLockUI();
        addBadge('mode-collection');
        glowButton('collection-zukan');
      } },

    // No.042-043 博士ストーリー：図鑑説明（初めて図鑑を開いた）
    { id:'zukan_intro_doctor', type:'doctor', context:'zukan_open', condition: () => true,
      pages: [
        '図鑑では、装置のカスタムと今まで集めた情報を閲覧できる',
        'これからは集めた情報を図鑑に書き込んでいってほしい、{name}くんに任せてもいいかな？',
      ] },

    // ※表がNo.044以降も続いていそうでしたが、画像で確認できたのはここまででした。
    //   続きがあれば教えてください。
  ];

  // ── SIDE_STEPS：メインの順番待ち列（STORY_STEPS）とは独立した「おまけ」の一言 ──
  // 条件を満たした時にだけ割り込みで表示され、表示済みかどうかは
  // saveData.storyProgress.sideDone[id] で個別に管理する（メインの進行度=nextIndexとは無関係）。
  // メインの列に混ぜてしまうと、これらの行動条件（スキル購入・無料パック受取・
  // プロフィール／チュートリアル／実績称号画面を開く）をプレイヤーがまだ行っていない間、
  // それ以降の全ステップ（Lv20やLv30の解放など）が表示されなくなってしまうため、
  // あえて別枠にしている。
  const SIDE_STEPS = [
    // No.030 チュートリアル：お気に入りスキルに関して（スキル購入後）
    { id:'favorite_skill_tutorial', type:'tutorial', context:'skill_purchased', condition: () => true,
      titleBase:'お気に入りスキルに関して',
      pages: [ { text:'（ダミーテキスト）設定からお気に入りのスキルをセットできる。セットしたスキルは必ず選択肢に登場する' } ] },

    // No.031 チュートリアル：バフに関して（初無料パック購入後）
    { id:'buff_tutorial', type:'tutorial', context:'free_pack_claimed', condition: () => true,
      titleBase:'バフに関して',
      pages: [ { text:'（ダミーテキスト）動画視聴後にもらえるEPと、EPバフに関して' } ] },

    // No.036 博士ストーリー：プロフィール説明（初めてプロフィールを開いた）
    { id:'profile_intro_doctor', type:'doctor', context:'profile_open', condition: () => true,
      pages: [ '（ダミーテキスト）プロフィールについての説明' ] },

    // No.037 博士ストーリー：チュートリアル説明（初めてチュートリアルを開いた）
    { id:'tutorial_screen_intro_doctor', type:'doctor', context:'tutorial_open', condition: () => true,
      pages: [ '（ダミーテキスト）チュートリアル一覧についての説明' ] },

    // No.038 博士ストーリー：実績称号説明（初めて実績称号を開いた）
    { id:'achievement_intro_doctor', type:'doctor', context:'achievement_open', condition: () => true,
      pages: [ '（ダミーテキスト）実績称号についての説明' ] },
  ];

  function quickPlayCount(){
    return window.Achievements ? window.Achievements.getStatValue('quickPlayCount') : 0;
  }
  // index.html側のリザルト集計処理でquickPlayCountと同じパターンで新設した統計値
  function endlessPlayCount(){
    return window.Achievements ? window.Achievements.getStatValue('endlessPlayCount') : 0;
  }
  function playerLevel(){
    return (typeof playerProgress !== 'undefined' && playerProgress.level) ? playerProgress.level : 1;
  }
  // 「新着あり」の赤バッジ（.has-unclaimed）を付ける。既存の実績称号・コレクションの
  // 未受け取りバッジと同じCSSクラスを流用している（index.html側でmode-shopにも
  // このクラスのスタイルを効かせるようセレクタを拡張済み）
  function addBadge(id){
    const el = document.getElementById(id);
    if (el) el.classList.add('has-unclaimed');
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
    if (!saveData.storyProgress.sideDone || typeof saveData.storyProgress.sideDone !== 'object') {
      saveData.storyProgress.sideDone = {};
    }
    return saveData.storyProgress;
  }
  function persist(){
    if (typeof saveSaveData === 'function') saveSaveData();
  }
  function isSideStepDone(id){
    return !!getProgress().sideDone[id];
  }
  function markSideStepDone(id){
    getProgress().sideDone[id] = true;
    persist();
  }

  let activePopupOpen = false; // 何らかのポップ表示中は多重発火を防ぐ
  // 現在表示中のステップ本体（メインの列のものかSIDE_STEPSのものかを問わず、
  // ここに入っているものを進行させる）。doctor/tutorialの「次へ」処理は
  // 全てこの変数を見るようにして、メインの列番号(nextIndex)に直接依存しないようにしている
  let activeStep = null;
  let activeStepIsSide = false;
  let pageIndex = 0;

  function advance(){
    getProgress().nextIndex += 1;
    persist();
    activePopupOpen = false;
    // 続けて次のステップの条件も既に満たされているかもしれないので、同じcontextで再チェックする
    check(lastContext);
  }
  // doctor/tutorialの表示が最後まで進んだ時に呼ぶ完了処理。
  // 今表示していたのがメインの列(STORY_STEPS)のものかSIDE_STEPSのものかで分岐する
  function finishActiveStep(){
    if (activeStepIsSide){
      markSideStepDone(activeStep.id);
      activePopupOpen = false;
      check(lastContext);
    } else {
      advance();
    }
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
      finishActiveStep();
    } else {
      renderDoctorPage(step);
    }
  }
  if (doctorOv){
    doctorOv.addEventListener('click', () => {
      if (doctorEntering) return; // 登場演出中はタップしても進めない
      if (activeStep && activeStep.type === 'doctor') advanceDoctor(activeStep);
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
    // ゲームプレイ中に割り込むタイプのチュートリアル（例：初アイテム獲得時）は、
    // 表示中だけゲームを一時停止する（index.html側に用意したwindow.setGamePausedを使う）
    if (step.pauseGame && typeof window.setGamePaused === 'function') window.setGamePaused(true);
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
      if (step.pauseGame && typeof window.setGamePaused === 'function') window.setGamePaused(false);
      if (step.effectsAfter) step.effectsAfter();
      finishActiveStep();
    } else {
      renderTutorialPage(step);
    }
  }
  if (tutOv){
    tutOv.addEventListener('click', () => {
      if (activeStep && activeStep.type === 'tutorial') advanceTutorial(activeStep);
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
  function runStep(step, isSide){
    activeStep = step;
    activeStepIsSide = !!isSide;
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

    // まずSIDE_STEPS（メインの列とは独立した「おまけ」の一言）に、条件を満たして
    // まだ見せていないものが無いか確認する。無ければメインの列を通常通りチェックする
    for (const side of SIDE_STEPS){
      if (isSideStepDone(side.id)) continue;
      if (side.context && side.context !== context) continue;
      if (!side.condition()) continue;
      runStep(side, true);
      return;
    }

    const idx = getProgress().nextIndex;
    const step = STORY_STEPS[idx];
    if (!step) return; // 用意されている分は全て終わった
    if (step.context && step.context !== context) return; // 想定の画面から呼ばれるまで待つ
    if (!step.condition()) return; // 条件未達
    runStep(step, false);
  }

  window.Story = { check };

  console.log('[story.js] 初期化完了。');
})();
