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
    { id:'matter',   label:'研究対象：磁晶核' },
    { id:'gimmick',  label:'岩・ギミック' },
    { id:'item',     label:'アイテム' },
    { id:'skill',    label:'スキル' },
    { id:'skin',     label:'見た目スキン' },
    { id:'gift',     label:'博士への差し入れ' },
  ];
  const ITEMS_PER_PAGE = 12;

  // 「研究対象：磁晶核」ページの実データ（9件）。
  // 解放条件：そのタイプの磁晶核が爆発したら（index.html側のunlockMatterZukan()から呼ばれる）
  const MATTER_ITEMS = [
    {
      id:'matter_1', name:'磁晶核', unlocked:false, iconPath:'assets/zukan/matter_1.png',
      desc:'透明な結晶構造の内部に、磁力に似た未知のエネルギーを内包する磁晶核。\n'
         + '現在確認されている磁晶核の中で最も標準的な個体であり、すべての研究はこの磁晶核の解析から始まった。\n'
         + '内部エネルギーの正体はいまだ解明されておらず、未知の可能性を秘めている。\n\n'
         + '博士メモ\n'
         + '「この小さな核が、いつかまだ見ぬ世界へ踏み出す力になるかもしれない。」',
    },
    {
      id:'matter_2', name:'跳躍磁晶核', unlocked:false, iconPath:'assets/zukan/matter_2.png',
      desc:'極めて滑らかな表面構造を持ち、外部から受けた力をほとんど失わず保持する特殊な磁晶核。\n'
         + '衝突や磁力による影響を受けるたびに勢いを増し、通常では考えられない距離を跳ね回る。\n'
         + 'その予測不能な軌道から、研究員の間では「跳ねる異常体」と呼ばれている。',
    },
    {
      id:'matter_3', name:'重力磁晶核', unlocked:false, iconPath:'assets/zukan/matter_3.png',
      desc:'周囲に微弱な重力場を発生させる磁晶核。\n'
         + '近くに存在する磁晶核を少しずつ引き寄せ、密集した領域を形成する性質を持つ。\n'
         + '単体ではエネルギー量に差はないが、数が集まることで巨大な連鎖反応を引き起こす可能性がある。',
    },
    {
      id:'matter_4', name:'追尾磁晶核', unlocked:false, iconPath:'assets/zukan/matter_4.png',
      desc:'周囲の磁力反応を感知し、自ら進む方向を変化させる特殊な磁晶核。\n'
         + '最も強い磁力反応を持つ場所へ向かう習性があり、逃げる対象を追跡するような挙動を見せる。\n'
         + 'ただし、反発磁場には影響を受けるため完全な制御能力ではない。',
    },
    {
      id:'matter_5', name:'遅延磁晶核', unlocked:false, iconPath:'assets/zukan/matter_5.png',
      desc:'外部から衝撃を受けても、すぐには反応を起こさない特殊な磁晶核。\n'
         + '一定時間の経過後、内部エネルギーが限界に達すると自発的に崩壊し、大きな爆発を発生させる。\n'
         + '残り時間が少なくなるほど赤い発光が強まり、危険状態であることを知らせる。',
    },
    {
      id:'matter_6', name:'S磁晶核', unlocked:false, iconPath:'assets/zukan/matter_6.png',
      desc:'S極の磁場にのみ反応する磁晶核。\n'
         + 'S極以外の刺激にはほとんど反応せず、内部エネルギーの安定性が非常に高い。\n'
         + '研究によって、他の磁晶核より高純度なエネルギー抽出が可能であることが判明している。',
    },
    {
      id:'matter_7', name:'N磁晶核', unlocked:false, iconPath:'assets/zukan/matter_7.png',
      desc:'N極の磁場にのみ反応する磁晶核。\n'
         + '反発磁場によるエネルギー変換効率が非常に高く、推進技術への応用が期待されている。\n'
         + '博士は、この性質こそ宇宙航行への鍵になると考えている。',
    },
    {
      id:'matter_8', name:'紅磁晶核', unlocked:false, iconPath:'assets/zukan/matter_8.png',
      desc:'透明な結晶構造の内部に、高密度の紅色磁晶を形成した希少な磁晶核。\n'
         + '内部エネルギーを二段階に分けて放出する性質を持ち、一度目の放出後もなお大量のエネルギーを保持している。\n'
         + 'その独特な放出特性は、次世代エネルギー変換技術への応用が期待されている。',
    },
    {
      id:'matter_9', name:'金磁晶核', unlocked:false, iconPath:'assets/zukan/matter_9.png',
      desc:'内部に極めて高純度の磁晶エネルギーを宿す、現在確認されている中で最も希少な磁晶核。\n'
         + '莫大なエネルギーを放出した後も、自身の一部を新たな磁晶核として生成する特異な性質を持つ。\n'
         + 'もしこの現象を再現できれば、持続可能なエネルギー供給への大きな一歩となるだろう。',
    },
  ];

  // 「岩・ギミック」ページの実データ（9件）。
  // 解放条件：その岩の特殊能力／ギミック装置の効果が発動したら
  // （index.html側のunlockRockGimmickZukan() / unlockHoleGimmickZukan()から呼ばれる）
  const GIMMICK_ITEMS = [
    {
      id:'gimmick_1', name:'岩：反跳', unlocked:false, iconPath:'assets/zukan/gimmick_1.png',
      desc:'内部に高い反発エネルギーを蓄えた特殊岩。\n'
         + '覚醒すると、渦に取り込まれた磁晶核を勢いよく弾き返す性質を持つ。\n'
         + '弾かれた磁晶核は新たな連鎖の起点となることがあり、予想外の流れを生み出す。',
    },
    {
      id:'gimmick_2', name:'岩：波動', unlocked:false, iconPath:'assets/zukan/gimmick_2.png',
      desc:'周期的に衝撃波を放つ特殊岩。\n'
         + '覚醒中は周囲の磁晶核を押し出し、フィールド全体の配置を大きく変化させる。\n'
         + '衝撃波そのものでは爆発は起こらない。',
    },
    {
      id:'gimmick_3', name:'岩：分裂', unlocked:false, iconPath:'assets/zukan/gimmick_3.png',
      desc:'磁晶核の構造を分解・再形成する特殊岩。\n'
         + '覚醒中に接触した磁晶核は消滅し、その場から複数の標準磁晶核が放出される。\n'
         + '一度分裂して生成された磁晶核は、再び分裂することはない。',
    },
    {
      id:'gimmick_4', name:'岩：共鳴', unlocked:false, iconPath:'assets/zukan/gimmick_4.png',
      desc:'同種の岩と共鳴する性質を持つ特殊岩。\n'
         + '覚醒中に磁晶核が接触すると、自身だけでなく他の共鳴岩も順番に反応を起こす。\n'
         + '離れた位置にあっても連鎖的に爆発が発生するため、フィールド全体を巻き込んだ大規模な連鎖の起点となることがある。',
    },
    {
      id:'gimmick_5', name:'ギミック：磁力超強化', unlocked:false, iconPath:'assets/zukan/gimmick_5.png',
      desc:'ギミック装置に蓄積したエネルギーをプレイヤーの磁場制御装置へ供給し、S極・N極磁場を一時的に増幅するプログラム。\n'
         + '通常では観測できない高出力環境のデータ取得を目的としている。',
    },
    {
      id:'gimmick_6', name:'ギミック：岩覚醒', unlocked:false, iconPath:'assets/zukan/gimmick_6.png',
      desc:'研究フィールド内の岩を一斉に覚醒状態へ移行させるプログラム。\n'
         + '各特殊岩が持つ能力を同時に観測できるため、大規模な実験で使用される。',
    },
    {
      id:'gimmick_7', name:'ギミック：ぐるぐる大旋風', unlocked:false, iconPath:'assets/zukan/gimmick_7.png',
      desc:'研究フィールド全体へ回転磁場を発生させるプログラム。\n'
         + '磁晶核が渦を描くように運動することで、通常とは異なるエネルギー伝達パターンを観測できる。',
    },
    {
      id:'gimmick_8', name:'ギミック：磁晶核フィーバー', unlocked:false, iconPath:'assets/zukan/gimmick_8.png',
      desc:'フィールド内で維持できる磁晶核の上限を一時的に拡張するプログラム。\n'
         + '通常では観測できない数の磁晶核が同時に存在可能となり、希少な磁晶核も出現しやすくなる。',
    },
    {
      id:'gimmick_9', name:'ギミック：超爆発ラッシュ', unlocked:false, iconPath:'assets/zukan/gimmick_9.png',
      desc:'磁晶核同士の連鎖反応を極限まで増幅するプログラム。\n'
         + '通常では発生しない規模のエネルギー連鎖を人工的に作り出し、未知エネルギーの限界性能を観測する。',
    },
  ];

  // 「アイテム」ページの実データ（11件）。
  // 解放条件：プレイ中にそのアイテムを1回でも取得したら（index.html側のunlockItemZukan()から呼ばれる）
  const ITEM_ITEMS = [
    {
      id:'item_1', name:'アイテム：S極強化', unlocked:false, iconPath:'assets/zukan/item_1.png',
      desc:'S極磁場の出力を強化する拡張モジュール。\n取得するたびにS極の引力が1段階上昇する。最大Lv6まで強化可能。',
    },
    {
      id:'item_2', name:'アイテム：N極強化', unlocked:false, iconPath:'assets/zukan/item_2.png',
      desc:'N極磁場の出力を強化する拡張モジュール。\n取得するたびにN極の斥力が1段階上昇する。最大Lv6まで強化可能。',
    },
    {
      id:'item_3', name:'アイテム：レンジアップ', unlocked:false, iconPath:'assets/zukan/item_3.png',
      desc:'磁場の有効範囲を拡張する補助モジュール。\n取得するたびに磁力の届く範囲が広がる。最大Lv6まで強化可能。',
    },
    {
      id:'item_4', name:'アイテム：チェイン倍率アップ', unlocked:false, iconPath:'assets/zukan/item_4.png',
      desc:'チェイン時のスコア倍率を強化する演算モジュール。\n取得するたびにチェイン倍率が1段階上昇する。最大Lv10まで強化可能。',
    },
    {
      id:'item_5', name:'アイテム：爆発強化', unlocked:false, iconPath:'assets/zukan/item_5.png',
      desc:'磁晶核の爆発エネルギーを増幅する強化モジュール。\n取得するたびに爆発の威力と影響範囲が強化される。最大Lv10まで強化可能。',
    },
    {
      id:'item_6', name:'アイテム：小型バッテリー', unlocked:false, iconPath:'assets/zukan/item_6.png',
      desc:'研究装置へ安定した電力を供給する標準バッテリー。\n取得すると、バッテリーを確実に20%回復できる。',
    },
    {
      id:'item_7', name:'アイテム：改造バッテリー', unlocked:false, iconPath:'assets/zukan/item_7.png',
      desc:'出力を高めた試作型バッテリー。\n約70%の確率で大きく回復するが、約30%の確率でバッテリーが減少するようになった。',
    },
    {
      id:'item_8', name:'アイテム：暴走バッテリー', unlocked:false, iconPath:'assets/zukan/item_8.png',
      desc:'限界まで出力を引き上げた実験用バッテリー。その反動で非常に不安定な状態になってしまい。\n'
         + '改造バッテリーより成功時の回復量が大きい一方、失敗時は大幅にバッテリーが減少するハイリスク・ハイリターンな性能を持つ。',
    },
    {
      id:'item_9', name:'アイテム：レアブースター', unlocked:false, iconPath:'assets/zukan/item_9.png',
      desc:'希少な磁晶核の生成率を高める探索モジュール。\n取得するたびに紅磁晶核・金磁晶核の出現率が上昇する。最大Lv6まで強化可能。',
    },
    {
      id:'item_10', name:'アイテム：スキルチャージャー', unlocked:false, iconPath:'assets/zukan/item_10.png',
      desc:'SPエネルギーの回収効率を高める補助モジュール。\n取得するたびにSPゲージが溜まりやすくなる。最大Lv10まで強化可能。',
    },
    {
      id:'item_11', name:'アイテム：+30EP', unlocked:false, iconPath:'assets/zukan/item_11.png',
      desc:'プレイ中の強化アイテムが最大Lvに達すると出現する特殊アイテム。\n取得すると30EPを獲得できる。これ以上強化に利用されないエネルギーは、EPへ変換される。',
    },
  ];

  // 「スキル」ページの実データ（9件）。
  // 解放条件：スキル選択画面でSTART GAMEを押した時、選択中のスキルを使用済みとして記録し解放
  // （index.html側のunlockSkillZukan()から呼ばれる。実績称号「収集開始/装備充実/完全武装」と同じ発動タイミング）
  const SKILL_ITEMS = [
    {
      id:'skill_1', name:'スキル：ブリンク', unlocked:false, iconPath:'assets/zukan/skill_1.png',
      desc:'空間磁場を歪ませ、約500px先へ瞬間移動する転位装置。\n緊急回避や素早い位置取りに適している。',
    },
    {
      id:'skill_2', name:'スキル：玉運動停止', unlocked:false, iconPath:'assets/zukan/skill_2.png',
      desc:'局所的な磁場制御によって、磁晶核の運動エネルギーを一時的に抑制する制御装置。\n発動中は磁力範囲内の磁晶核が静止し、狙いどおりの配置を作りやすくなる。',
    },
    {
      id:'skill_3', name:'スキル：マグネットスイープ', unlocked:false, iconPath:'assets/zukan/skill_3.png',
      desc:'前方へ扇状の磁場を放ち、磁晶核をまとめて弾き飛ばす掃討装置。\n'
         + 'N極で使用すると射程が伸びるため、離れた磁晶核にも届きやすい。\n'
         + '密集した磁晶核を崩したり、連鎖の起点を作ったりと扱いやすいスキル。',
    },
    {
      id:'skill_4', name:'スキル：シールド', unlocked:false, iconPath:'assets/zukan/skill_4.png',
      desc:'約10秒間、引き寄せた磁晶核を保護する防護装置。\n発動中は磁晶核が破壊されず、遅延磁晶核のタイマーも停止する。',
    },
    {
      id:'skill_5', name:'スキル：台風の目', unlocked:false, iconPath:'assets/zukan/skill_5.png',
      desc:'約3秒間、周囲へ持続的な吸引磁場を発生させる集束装置。\n'
         + '磁晶核を一か所へゆっくり集め続けることで、広範囲を巻き込み大規模なチェインを狙える強力なスキル。\n'
         + '岩やギミックの近くで発動すると、思わぬ連鎖につながることもある。',
    },
    {
      id:'skill_6', name:'スキル：ワープビーコン', unlocked:false, iconPath:'assets/zukan/skill_6.png',
      desc:'設置と帰還の2段階で使用する転位装置。\n'
         + '1回目で現在地を記録し、半径600px以内のアイテムを検知。2回目で記録地点へ瞬間移動する。\n'
         + 'ビーコン周辺ではアイテムが出現しやすい傾向が確認されている。',
    },
    {
      id:'skill_7', name:'スキル：ダッシュ', unlocked:false, iconPath:'assets/zukan/skill_7.png',
      desc:'約3秒間、研究装置の出力を引き上げて高速移動できる。\n広いフィールドの移動やアイテム回収に役立つ。',
    },
    {
      id:'skill_8', name:'スキル：大砲', unlocked:false, iconPath:'assets/zukan/skill_8.png',
      desc:'巨大な磁晶核を前方へ射出する高出力スキル。\n'
         + '発射中の砲弾は無敵状態となり、進路上の磁晶核を巻き込みながら突き進む。\n'
         + '密集地帯へ撃ち込めば、大規模な連鎖反応の起点となる。',
    },
    {
      id:'skill_9', name:'スキル：エネルギー変換器', unlocked:false, iconPath:'assets/zukan/skill_9.png',
      desc:'約10秒間、磁晶核が爆発するたびにバッテリーが0.2%ずつ回復する。\n'
         + '爆発時に放出されるエネルギーの一部を電力へ変換することで、連鎖が続くほど効率よくバッテリーを補給できる。\n'
         + 'この変換技術は、新たなエネルギー源としての実用化を目指し、現在も研究が続けられている。',
    },
  ];

  // 仮データ：まだ内容をもらっていないカテゴリは、これまで通りの12個プレースホルダーのまま
  const ZUKAN_DATA = CATEGORIES.map(cat => {
    if (cat.id === 'matter')  return { ...cat, items: MATTER_ITEMS };
    if (cat.id === 'gimmick') return { ...cat, items: GIMMICK_ITEMS };
    if (cat.id === 'item')    return { ...cat, items: ITEM_ITEMS };
    if (cat.id === 'skill')   return { ...cat, items: SKILL_ITEMS };
    return {
      ...cat,
      items: Array.from({length: ITEMS_PER_PAGE}, (_,i) => ({
        id: `${cat.id}_${i+1}`,
        name: `${cat.label} No.${i+1}`,
        unlocked: false,
        desc: null,
        iconPath: null, // 決まったら 'assets/zukan/xxx.png' 等をここに
      })),
    };
  });

  // ── 解放状態の永続化（saveData.collection に { [id]: true } の形で保存） ──
  function getUnlockStore(){
    if (typeof saveData === 'undefined') return {};
    if (!saveData.collection || typeof saveData.collection !== 'object' || Array.isArray(saveData.collection)) {
      saveData.collection = {};
    }
    return saveData.collection;
  }
  function persist(){
    if (typeof saveSaveData === 'function') saveSaveData();
  }
  // 起動時：保存済みの解放状態をZUKAN_DATAに反映する
  (function applySavedUnlockState(){
    const store = getUnlockStore();
    for (const cat of ZUKAN_DATA){
      for (const item of cat.items){
        if (store[item.id]) item.unlocked = true;
      }
    }
  })();
  // 他ファイル（index.html本体）から実績と同じ要領で呼び出す解放関数
  function unlock(id){
    for (const cat of ZUKAN_DATA){
      const item = cat.items.find(it => it.id === id);
      if (!item) continue;
      if (item.unlocked) return;
      item.unlocked = true;
      getUnlockStore()[id] = true;
      persist();
      renderGrid(); // 今そのページを開いていた場合に見た目へ反映
      return;
    }
  }
  // 図鑑達成率（プロフィール画面用）：全項目のうち解放済みの割合
  function getCompletionRate(){
    let total = 0, unlocked = 0;
    for (const cat of ZUKAN_DATA){
      for (const item of cat.items){
        total++;
        if (item.unlocked) unlocked++;
      }
    }
    return total ? unlocked / total : 0;
  }
  window.Zukan = { unlock, getCompletionRate };

  let currentPage = 0;

  const screen        = byId('zukan-screen');
  const grid          = byId('zukan-grid');
  const categoryLabel = byId('zukan-category-label');
  const dotsEl        = byId('zukan-dots');
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
    const cat = ZUKAN_DATA[currentPage];
    if (categoryLabel) categoryLabel.textContent = `＞ ${cat.label}`;
    grid.innerHTML = '';
    for (let i = 0; i < ITEMS_PER_PAGE; i++){
      const item = cat.items[i];
      const cell = document.createElement('button');
      if (!item){
        // データ自体がまだ無いマス：詰めずに空けておく。薄いグレーで、押しても何も起きない
        cell.className = 'zukan-cell empty';
        cell.disabled = true;
        cell.tabIndex = -1;
        grid.appendChild(cell);
        continue;
      }
      cell.className = 'zukan-cell' + (item.unlocked ? ' unlocked' : ' locked');
      if (item.iconPath){
        const img = document.createElement('img');
        img.className = 'zukan-cell-icon';
        // 読み込み確認が終わるまで非表示にしておく。こうしないと、ファイルが無い場合に
        // 「画像が壊れています」アイコンが一瞬だけ表示され、それが消えた瞬間にレイアウトが
        // ガタッと変わって見える（＝「開くと一瞬サイズがおかしい」という見え方の原因だった）
        img.style.display = 'none';
        img.onload = () => { img.style.display = ''; };
        img.onerror = () => img.remove();
        img.src = item.iconPath;
        cell.appendChild(img);
      }
      cell.addEventListener('click', () => openPopup(item));
      grid.appendChild(cell);
    }
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
    popupBody.textContent = item.unlocked
      ? (item.desc || '詳細は後日追加されます。')
      : 'まだ解析が完了していない研究対象のようだ。';
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
    collectionZukanBtn.addEventListener('touchstart', e=>{ e.preventDefault(); }, {passive:false});
    collectionZukanBtn.addEventListener('touchend', e=>{ e.preventDefault(); openZukan(); }, {passive:false});
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
