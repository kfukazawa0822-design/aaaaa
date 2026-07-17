// ==========================================================================
// js/achievements.js — 実績称号（アチーブメント）システム
//
// 実績には2種類ある：
//   1) 単発実績（title/ep/desc/condition を直接持つ）
//      例：ach_001〜ach_014、ach_025（全実績コンプリート）
//   2) 段階実績（tiers配列を持つ。tierごとにtitle/ep/thresholdがある）
//      例：ach_015〜ach_024
//
// 段階実績の状態はsaveData.titles[id]に
//   { notifiedTiers:[bool,...], claimedTiers:[bool,...], claimedAt, claimedLevel }
// という形で持つ。notifiedTiers[i]=true は「そのtierの閾値に到達し、
// トースト通知済み」を意味し、claimedTiers[i]=true は「そのtier分のEPを
// 実際に受け取り済み」を意味する（閾値到達と受け取りは別イベント）。
//
// 段階実績のカウント元データはsaveData.stats（{ [statKey]: 数値 }）に
// 蓄積する。index.html本体側から window.Achievements.incrementStat(key) /
// setStatIfHigher(key, value) / markSkillUsed(id) を呼ぶことで、
// カウントアップ→閾値チェック→（必要なら）トースト表示までを内部で行う。
//
// index.html本体側のグローバル関数・変数（addCoins, saveData, playerProgress,
// updatePlayerStatusBar, saveSaveData）に依存しているため、
// index.html本体の<script>より後、js/collection.jsより前に読み込むこと。
//
// 【今後、単発実績を追加するとき】
//   ACHIEVEMENT_DEFSに { id, no, title, ep, desc, condition } を1件追加し、
//   条件が満たされたタイミングで window.Achievements.unlock(id) を呼ぶ。
//
// 【今後、段階実績を追加するとき】
//   { id, no, statKey, progressLabel, progressUnit(省略可), desc, tiers:[{title,ep,threshold},...] }
//   を1件追加し、該当カウンターの更新箇所で
//   window.Achievements.incrementStat(statKey) または
//   window.Achievements.setStatIfHigher(statKey, value) を呼ぶ。
//
// 【現状まだ未実装のため休止中の実績】
//   ach_022（アイコン所持数）：ショップのアイコンガチャ実装後に着手
//   ach_023（博士への差し入れ）：差し入れ機能の実装後に着手
//   ach_024（図鑑進捗）：図鑑コンテンツ実装後に着手
//   → いずれも定義だけ先に登録してあるので、対応する統計値
//     （ownedIconCount / doctorGiftCount / zukanProgressPercent）を
//     incrementStat等で更新し始めれば、自動的に機能し始める。
// ==========================================================================

(function(){
  const ACHIEVEMENT_DEFS = [
    // ── 単発実績 ──
    { id:'ach_001', no:'001', title:'研究開始',       ep:20,   desc:'初めて研究に参加した。',                 condition:'クイックモード初プレイでリザルト画面を見た' },
    { id:'ach_002', no:'002', title:'物資管理係',     ep:20,   desc:'研究所の設備が利用可能になった。',       condition:'ショップ機能解放' },
    { id:'ach_003', no:'003', title:'終わらない実験', ep:20,   desc:'終わりなき研究へ足を踏み入れた。',       condition:'エンドレスモード初プレイでリザルト画面を見た' },
    { id:'ach_004', no:'004', title:'記録係',         ep:20,   desc:'発見した研究成果を記録し始めた。',       condition:'コレクション機能解放' },
    { id:'ach_005', no:'005', title:'一人前の助手',   ep:20,   desc:'博士から少しだけ頼られるようになった。', condition:'プレイヤーレベル Lv20達成',  levelReq:20 },
    { id:'ach_006', no:'006', title:'主任研究員',     ep:200,  desc:'研究所を支える存在へ成長した。',         condition:'プレイヤーレベル Lv50達成',  levelReq:50 },
    { id:'ach_007', no:'007', title:'主席研究員',     ep:1000, desc:'その名は研究所中に知れ渡っている。',     condition:'プレイヤーレベル Lv100達成', levelReq:100 },
    { id:'ach_008', no:'008', title:'S極マスター',    ep:50,   desc:'S極の扱いを極めた。',                    condition:'アイテム：S極強化をLvMAXにした' },
    { id:'ach_009', no:'009', title:'N極マスター',    ep:50,   desc:'N極を自在に操れるようになった。',        condition:'アイテム：N極強化をLvMAXにした' },
    { id:'ach_010', no:'010', title:'年金生活',       ep:100,  desc:'これ以上強化できないアイテムは、EPとして蓄積されるようだ。', condition:'アイテム：30EPを獲得した' },
    { id:'ach_011', no:'011', title:'ハズレくじ',     ep:20,   desc:'運試しは、いつもうまくいくとは限らない。', condition:'アイテム：バッテリーでハズレを引いた' },
    { id:'ach_012', no:'012', title:'起死回生',       ep:20,   desc:'危機的状況から立て直した。',              condition:'バッテリー残量10%以下で、バッテリーを取得して回復する' },
    { id:'ach_013', no:'013', title:'トリッキー',     ep:50,   desc:'N極だけで押し切った。',                  condition:'90秒間連続でN極を維持した' },
    { id:'ach_014', no:'014', title:'尽きない探究心', ep:200,  desc:'長時間の研究に耐え抜いた。',              condition:'180秒生き残る' },

    // ── 段階実績 ──
    { id:'ach_015', no:'015', statKey:'gimmickTriggerCount', progressLabel:'ギミック発動回数',
      desc:'あらゆる実験装置を使いこなした。',
      tiers:[ {title:'起動確認',ep:20,threshold:1}, {title:'実験技師',ep:50,threshold:20}, {title:'ギミックマスター',ep:200,threshold:50} ] },
    { id:'ach_016', no:'016', statKey:'redMarbleSpawned', progressLabel:'紅晶出現回数',
      desc:'紅晶を知り尽くした第一人者。',
      tiers:[ {title:'紅晶観測',ep:20,threshold:1}, {title:'紅晶研究員',ep:50,threshold:50}, {title:'紅晶博士',ep:200,threshold:200} ] },
    { id:'ach_017', no:'017', statKey:'goldMarbleSpawned', progressLabel:'金晶出現回数',
      desc:'金晶を知り尽くした第一人者。',
      tiers:[ {title:'黄金の輝き',ep:20,threshold:1}, {title:'金晶研究員',ep:50,threshold:50}, {title:'金晶博士',ep:200,threshold:200} ] },
    { id:'ach_018', no:'018', statKey:'bestChainCount', progressLabel:'1回のプレイでの最大チェイン数', progressUnit:'',
      desc:'宇宙誕生を思わせる究極の連鎖を達成した。',
      tiers:[ {title:'恒星爆発',ep:20,threshold:50}, {title:'銀河爆発',ep:50,threshold:150}, {title:'ビックバン',ep:200,threshold:300} ] },
    { id:'ach_019', no:'019', statKey:'bestScore', progressLabel:'1回のプレイでの最高スコア', progressUnit:'',
      desc:'誰もが認める実力者となった。',
      tiers:[ {title:'手練れ',ep:20,threshold:200000}, {title:'敏腕',ep:50,threshold:1000000}, {title:'超一流',ep:500,threshold:2000000} ] },
    { id:'ach_020', no:'020', statKey:'totalPlayCount', progressLabel:'総プレイ回数',
      desc:'もはや研究所が第二の家になった。',
      tiers:[ {title:'研究メンバー',ep:20,threshold:10}, {title:'プロジェクトリーダー',ep:50,threshold:50}, {title:'研究所の住人',ep:500,threshold:200} ] },
    { id:'ach_021', no:'021', statKey:'usedSkillCount', progressLabel:'使用したことのあるスキル数', progressUnit:'個',
      desc:'あらゆる状況に対応できる装備が揃った。',
      tiers:[ {title:'収集開始',ep:20,threshold:4}, {title:'装備充実',ep:50,threshold:6}, {title:'完全武装',ep:200,threshold:9} ] },
    { id:'ach_022', no:'022', statKey:'ownedIconCount', progressLabel:'所持アイコン数', progressUnit:'個',
      desc:'もう、決まった姿でいる必要はない。',
      tiers:[ {title:'わたしは…',ep:20,threshold:2}, {title:'気分屋さん',ep:50,threshold:6}, {title:'正体不明',ep:500,threshold:12} ] },
    { id:'ach_023', no:'023', statKey:'doctorGiftCount', progressLabel:'博士への差し入れ回数',
      desc:'博士の夢を支えた、かけがえのない存在。',
      tiers:[ {title:'やさしい助手',ep:20,threshold:1}, {title:'世話好き',ep:50,threshold:3}, {title:'博士の恩人',ep:500,threshold:8} ] },
    { id:'ach_024', no:'024', statKey:'zukanProgressPercent', progressLabel:'図鑑進捗', progressUnit:'%',
      desc:'あらゆる研究成果を記録した。',
      tiers:[ {title:'コレクター',ep:100,threshold:50}, {title:'全知全能',ep:500,threshold:100} ] },

    // ── メタ実績（他の全実績が受け取り済みになったら解除） ──
    { id:'ach_025', no:'025', title:'伝説の研究者', ep:1000, desc:'この研究所に、新たな伝説を刻んだ。', condition:'全実績コンプリート', metaAllComplete:true },
  ];

  // ── 状態の読み書き（saveData.titles に永続化） ──
  function getTitlesStore(){
    if (typeof saveData === 'undefined') return {};
    if (!saveData.titles || Array.isArray(saveData.titles)) saveData.titles = {};
    return saveData.titles;
  }
  function getState(id){
    const store = getTitlesStore();
    return store[id] || (store[id] = { unlocked:false, claimed:false });
  }
  function getStatsStore(){
    if (typeof saveData === 'undefined') return {};
    if (!saveData.stats || typeof saveData.stats !== 'object' || Array.isArray(saveData.stats)) saveData.stats = {};
    return saveData.stats;
  }
  function getStatValue(key){
    if (!key) return 0;
    return getStatsStore()[key] || 0;
  }
  function persist(){
    if (typeof saveSaveData === 'function') saveSaveData();
  }
  function formatClaimDate(d){
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
  }

  // ── 未受け取りバッジ ──
  function hasUnclaimed(){
    return ACHIEVEMENT_DEFS.some(def => {
      const s = getState(def.id);
      if (def.tiers) {
        const notified = s.notifiedTiers || [];
        const claimed  = s.claimedTiers  || [];
        return notified.some((n,i) => n && !claimed[i]);
      }
      return s.unlocked && !s.claimed;
    });
  }
  function updateBadges(){
    const unclaimed = hasUnclaimed();
    const modeCollectionBtn   = document.getElementById('mode-collection');
    const achievementsCardBtn = document.getElementById('collection-achievements');
    // コレクション機能自体がまだ解放されていない間は、モード選択画面の
    // コレクションボタンに赤バッジを出さない（ロック中なのにバッジが付くのは不自然なため）
    const collectionUnlocked = !(typeof saveData !== 'undefined' && saveData.storyFlags && !saveData.storyFlags.collectionUnlocked);
    if (modeCollectionBtn)   modeCollectionBtn.classList.toggle('has-unclaimed', unclaimed && collectionUnlocked);
    if (achievementsCardBtn) achievementsCardBtn.classList.toggle('has-unclaimed', unclaimed);
  }

  // ── 実績解除ポップ（画面左下からにゅっと出るトースト） ──
  function ensureToastStack(){
    let stack = document.getElementById('achievement-toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'achievement-toast-stack';
      document.body.appendChild(stack);
    }
    return stack;
  }
  // ── 実績解除ポップ（画面左下からにゅっと出るトースト） ──
  // 複数の実績がほぼ同時に解除された時に、全部いっぺんに出てきて重なって
  // 見えてしまうのを防ぐため、表示はキューに積んで0.2秒間隔で1つずつ出す。
  // （1個目が入る→2個目が来たら1個目が上へ、2個目が左から入る…という
  //   ドミノ式の積み上がりは、1つずつ間隔を空けて生成することで自然に実現される）
  const toastQueue = [];
  let toastQueueRunning = false;
  const TOAST_STAGGER_MS = 300;

  function queueToast(titleText, conditionText){
    toastQueue.push({ titleText, conditionText });
    if (!toastQueueRunning) processToastQueue();
  }
  function processToastQueue(){
    if (toastQueue.length === 0){ toastQueueRunning = false; return; }
    toastQueueRunning = true;
    const { titleText, conditionText } = toastQueue.shift();
    createToastElement(titleText, conditionText);
    setTimeout(processToastQueue, TOAST_STAGGER_MS);
  }
  function createToastElement(titleText, conditionText){
    const stack = ensureToastStack();
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML =
      `<div class="achievement-toast-label">実績解除！</div>` +
      `<div class="achievement-toast-title">${titleText}</div>` +
      (conditionText ? `<div class="achievement-toast-condition">${conditionText}</div>` : '');
    stack.appendChild(toast);
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{ toast.classList.add('show'); });
    });
    setTimeout(()=>{
      toast.classList.remove('show');
      toast.classList.add('leaving');
      setTimeout(()=>{ if (toast.parentNode) toast.remove(); }, 400);
    }, 3800); // 詳細（達成条件）が増えた分、読む時間を確保
  }
  function showToast(titleText, conditionText){
    queueToast(titleText, conditionText);
  }
  // 段階実績のtierごとの達成条件テキストを、コレクション画面の未解放カードと
  // 同じ書式（進捗ラベル：しきい値+単位）で組み立てる
  function tierConditionText(def, tier){
    const unit = def.progressUnit ?? '回';
    return `${def.progressLabel}：${tier.threshold.toLocaleString()}${unit}達成`;
  }
  function refreshCollectionUI(){
    if (window.CollectionUI && typeof window.CollectionUI.refreshAchievements === 'function') {
      window.CollectionUI.refreshAchievements();
    }
  }

  // ── 単発実績の解除処理（同じidを何度呼んでも、実際に解除されるのは最初の1回だけ） ──
  function unlock(id){
    const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
    if (!def || def.tiers) return;
    const state = getState(id);
    if (state.unlocked) return;
    state.unlocked = true;
    persist();
    showToast(def.title, def.condition);
    updateBadges();
    refreshCollectionUI();
  }

  // ── 段階実績：統計値の閾値到達チェック（値が更新されるたびに呼ぶ） ──
  function checkTiered(def){
    if (!def || !def.tiers) return;
    const value = getStatValue(def.statKey);
    const state = getState(def.id);
    if (!Array.isArray(state.notifiedTiers) || state.notifiedTiers.length !== def.tiers.length) {
      state.notifiedTiers = def.tiers.map(()=>false);
    }
    if (!Array.isArray(state.claimedTiers) || state.claimedTiers.length !== def.tiers.length) {
      state.claimedTiers = def.tiers.map(()=>false);
    }
    let changed = false;
    def.tiers.forEach((tier, i) => {
      if (!state.notifiedTiers[i] && value >= tier.threshold) {
        state.notifiedTiers[i] = true;
        changed = true;
        showToast(tier.title, tierConditionText(def, tier));
      }
    });
    if (changed) {
      persist();
      updateBadges();
      refreshCollectionUI();
    }
  }

  // ── 統計値の更新（累計カウント／セッション内ベスト値／スキル使用済みSet） ──
  function incrementStat(key, amount = 1){
    if (!key) return;
    const stats = getStatsStore();
    stats[key] = (stats[key] || 0) + amount;
    persist();
    const def = ACHIEVEMENT_DEFS.find(d => d.statKey === key);
    if (def) checkTiered(def);
  }
  function setStatIfHigher(key, value){
    if (!key) return;
    const stats = getStatsStore();
    if (!(stats[key] > value)) {
      stats[key] = value;
      persist();
      const def = ACHIEVEMENT_DEFS.find(d => d.statKey === key);
      if (def) checkTiered(def);
    }
  }
  function markSkillUsed(skillId){
    if (!skillId) return;
    const stats = getStatsStore();
    if (!Array.isArray(stats.usedSkillIds)) stats.usedSkillIds = [];
    if (!stats.usedSkillIds.includes(skillId)) {
      stats.usedSkillIds.push(skillId);
      stats.usedSkillCount = stats.usedSkillIds.length;
      persist();
      const def = ACHIEVEMENT_DEFS.find(d => d.statKey === 'usedSkillCount');
      if (def) checkTiered(def);
    }
  }

  // ── メタ実績（全実績コンプリート）チェック ──
  function checkMetaAchievement(){
    const metaDef = ACHIEVEMENT_DEFS.find(d => d.metaAllComplete);
    if (!metaDef) return;
    const others = ACHIEVEMENT_DEFS.filter(d => d !== metaDef);
    const allDone = others.every(def => {
      const s = getState(def.id);
      if (def.tiers) {
        const claimed = s.claimedTiers || [];
        return claimed.length === def.tiers.length && claimed.every(Boolean);
      }
      return !!s.claimed;
    });
    if (allDone) unlock(metaDef.id);
  }

  // ── 受け取り処理（コレクション画面でカードをタップした時にcollection.js側から呼ぶ） ──
  // 単発実績：claim(id) / 段階実績：claim(id, tierIndex)
  // 戻り値：{ ep, claimedAt, claimedLevel, isFinalTier } （受け取れなかった場合はnull）
  function claim(id, tierIndex){
    const def = ACHIEVEMENT_DEFS.find(d => d.id === id);
    if (!def) return null;
    const state = getState(id);
    const now = new Date();

    if (def.tiers) {
      if (tierIndex == null) return null;
      const notified = state.notifiedTiers || [];
      const claimed  = state.claimedTiers  || [];
      if (!notified[tierIndex] || claimed[tierIndex]) return null;
      claimed[tierIndex] = true;
      state.claimedTiers = claimed;
      const tier = def.tiers[tierIndex];
      state.claimedAt    = formatClaimDate(now);
      state.claimedLevel = (typeof playerProgress !== 'undefined') ? playerProgress.level : null;
      persist();
      if (typeof addCoins === 'function') addCoins(tier.ep);
      if (typeof updatePlayerStatusBar === 'function') updatePlayerStatusBar();
      updateBadges();
      checkMetaAchievement();
      return { ep: tier.ep, claimedAt: state.claimedAt, claimedLevel: state.claimedLevel, isFinalTier: tierIndex === def.tiers.length - 1 };
    }

    if (!state.unlocked || state.claimed) return null;
    state.claimed = true;
    state.claimedAt    = formatClaimDate(now);
    state.claimedLevel = (typeof playerProgress !== 'undefined') ? playerProgress.level : null;
    persist();
    if (typeof addCoins === 'function') addCoins(def.ep);
    if (typeof updatePlayerStatusBar === 'function') updatePlayerStatusBar();
    updateBadges();
    checkMetaAchievement();
    return { ep: def.ep, claimedAt: state.claimedAt, claimedLevel: state.claimedLevel };
  }

  // ── レベル到達型の実績をまとめてチェック（grantXP後・起動時に呼ぶ） ──
  function checkLevelAchievements(){
    if (typeof playerProgress === 'undefined') return;
    for (const def of ACHIEVEMENT_DEFS) {
      if (def.levelReq && playerProgress.level >= def.levelReq) unlock(def.id);
    }
  }

  // ── 実績達成率（プロフィール画面用）：メタ実績を除いた全枠のうち、受け取り済みの割合 ──
  function getCompletionRate(){
    let total = 0, done = 0;
    for (const def of ACHIEVEMENT_DEFS) {
      if (def.metaAllComplete) continue; // メタ実績自身は分母に含めない
      const s = getState(def.id);
      if (def.tiers) {
        total += def.tiers.length;
        done  += (s.claimedTiers || []).filter(Boolean).length;
      } else {
        total += 1;
        if (s.claimed) done += 1;
      }
    }
    return total ? done / total : 0;
  }

  window.Achievements = {
    defs: ACHIEVEMENT_DEFS,
    getState,
    getStatValue,
    unlock,
    claim,
    incrementStat,
    setStatIfHigher,
    markSkillUsed,
    checkLevelAchievements,
    checkMetaAchievement,
    updateBadges,
    getCompletionRate,
  };

  // 起動時に一度チェック：この機能の追加より前から遊んでいたセーブデータでも、
  // 既に条件を満たしている実績があれば次回起動時にきちんと反映される
  checkLevelAchievements();
  for (const def of ACHIEVEMENT_DEFS) { if (def.tiers) checkTiered(def); }
  checkMetaAchievement();
  updateBadges();
})();
