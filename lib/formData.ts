export const BUILDING_TYPES = ['古玉器', '古銅器', '瓷器', '粉質佛牌', '金屬佛牌'] as const

export const CASE_STAGES = ['收件', '送檢中', '主體', '顯微', '360', '報告產製', '後台上架', '鑑定卡', '完成'] as const
export type CaseStage = (typeof CASE_STAGES)[number]
export type BuildingType = (typeof BUILDING_TYPES)[number]

export const APPRAISAL_RESULTS = [
  'C.C. (Clearly-Consistent)，與該年代真品特徵吻合',
  'I.C.(In-Consistent)，與該年代真品特徵不吻合',
  'R.C.(Roughly-Consistent)，與該年代真品特徵大致吻合',
]

export const FORM_OPTIONS: Record<string, Record<string, string[]>> = {
  古玉器: {
    形制_朝代: ['紅山文化 Hongshan','良渚文化 Liangzhu','齊家文化 Qijia','駱越文化 Lac Viet','石家河 Shijiahe','文化期 Others Neolithic','商代 Shang','西周 Zhou','商周 Shang to Zhou','春秋 Spring & Autumn','戰國 Warring States','漢代 Han','漢至六朝 Han to Six Dynasties','唐代 Tang','宋代 Song','元代 Yuan','遼金 Liao & Jin','明代 Ming','清代 Qing'],
    形制_紋飾: ['無 None','素面 Bare','人面紋 Face','龍紋 Dragon','龍鳳 Dragon & Phoenix','獸面紋 Beast-mask','饕餮紋 Taotie','穀紋 Grain','蒲紋 Rush Mat','雲雷紋 Cloud & Thunder','乳釘紋 Nipple','如意紋 Ruyi','人物 Human','胡人 Hu Figurine','鳥紋 Bird','鏤雕 Openwork','花卉紋 Floral','魚 Fish','瑞獸 Mythical Beast','螭龍 Chi-dragon','觀音 Guanyin','佛 Buddha','蝠紋 Bat','無事 Bare Surface','竹形 Bamboo','吉祥紋 Auspicious','提油 Stained','神人面 Deity Face'],
    形制_器形: ['玉豬龍 Pig-dragon','C形龍 C-dragon','勾雲形佩 Cloud Pendant','馬蹄形器 Horseshoe Ornament','玉鷹 Eagle','玉玦 Jade Jue','玉琮 Cong Tube','玉璧 Bi Disc','玉鉞 Yue Axe','山型器 Mountain Form','神人玉飾 Deity Face Ornament','玉戈 Ge Dagger','玉佩 Pendant','玉圭 Gui','手鐲 Bangle','勒子 Jade Tube','玉劍飾 Sword Fitting','玉劍璏 Sword Slide','玉劍隔 Sword Guard','玉璜 Arc Pendant','玉握豬 Grasp Pig','玉目琀 Eye Plug','玉衣片 Jade Suit Piece','玉印 Jade Seal','剛卯 Gangmao','玉含蟬 Jade Cicada','玉冠飾 Crown Ornament','玉帶鉤 Belt Hook','玉環佩 Ring Pendant','玉雕件 Jade Carving','玉牛 Jade Ox','玉羊 Jade Goat','玉鳥 Jade Bird','玉魚 Jade Fish','玉瓶 Jade Vessel','玉牌 Plaque','玉簪 Hairpin','玉筆洗 Washer','雕像 Jade Statue','玉扳指 Thumb Ring','鼻煙壺 Snuff Bottle'],
    材質: ['天然','透閃石_Tremolite','軟玉_Nephrite','翡翠_Jadeite','琉璃/玻璃_Ancient glaze/glass','蛇紋石_Serpentine','大理石_Marble','其他_others','合成玉_Synthetic Jade','白色蠟石/皂石_Steatite'],
    顯微特徵: ['紋飾工痕','染色鮮豔','白色毛絮','凹槽','孔洞/圓孔','平痕拋痕'],
    說明A: ['本物件經顯微檢測及材料分析後','並未偵測到現代化合物的加工殘留','並經光譜儀器檢測玉器用料為$$材質','尚符合古代玉器用料','不符合古代玉器製作用料','殘留物檢測具有酸蝕，染色加工反應','器表色變及沁色皆屬自然形成','與古玉器材質特徵並不相同','與古玉器材質特徵吻合'],
    說明B: ['顯微觀測下','器面具有自然風化、磨損的痕跡','砣具解玉砂痕及接刀痕特徵明確','器表蝕孔與結晶質變皆屬自然形成','治玉工藝邏輯及痕跡吻合古代工法','紋飾部分，雕工處偵測到螺旋式的機械工痕','洞口之鑽螺紋呈現平穩連續亦為機器所致','器表多處偵測到平行細密的高速拋痕，亦是機械打磨特徵','部分表面坑點分布一致，凹陷有不自然的深缺','該處可見，與古玉料切割取料方式不同','乃作偽者於時序陳佈失誤所致','晶體白絮現象並非自然結晶，乃酸蝕脫水所致','本件為運用天然玉料材質，混充古玉的特徵'],
    說明C: ['綜觀前述跡證','本件應為公元前5千年至前3千年（B.C.5000~3000）之紅山文化古玉器','本件應為公元前3千年至前2千年（B.C.3300~2000）之良渚文化古玉器','本件應為公元前2,300年至1,800年（B.C.2300~1800）之齊家文化古玉器','本件應為公元前17世紀至前11世紀（B.C.17th~11th）之商代古玉器','本件應為公元前11世紀至前8世紀（B.C.11th~8th）之西周古玉器','本件應為公元前8至前3世紀（B.C.8th~3th）之春秋戰國古玉器','本件應為公元前3世紀至西元3世紀（B.C.3th~A.D.3th）漢代古玉器','本件應為3世紀至6世紀（A.D.3rd~6th）之六朝時期古玉器','本件應為7世紀至10世紀（A.D.7th~10th）之唐代古玉器','本件應為10世紀至13世紀（A.D.10th~13th）之宋代古玉器','本件應為10世紀至13世紀（A.D.10th~13th）之遼金時期古玉器','本件應為13世紀至14世紀（A.D.13th~14th）之元代古玉器','本件應為14世紀至17世紀（A.D.14th~17th）之明代古玉器','本件應為17世紀至19世紀（A.D.17th~19th）之清代古玉器','本件應為19世紀至20世紀（A.D.19th~20th）之清晚期玉器','本件為近代仿品','本件為現代新品'],
  },
  古銅器: {
    形制_年代: ['商代 Shang Dynasty','商晚期 Late Shang Dynasty','西周 Western Zhou Dynasty','西周晚期 Late Western Zhou Dynasty','東周 Eastern Zhou Dynasty','春秋時期 Spring and Autumn Period','戰國時期 Warring States Period','漢代 Han Dynasty','漢至六朝 Han to Six Dynasties','唐代 Tang Dynasty','北魏 Northern Wei Dynasty','南北朝 Northern and Southern Dynasties','明代 Ming Dynasty','清代 Qing Dynasty','鄂爾多斯文化 Ordos Culture','藏傳 Tibetan'],
    形制_材質: ['青銅 Bronze','饕餮纹青銅 Bronze','獸纹青銅 Bronze','海獸紋青銅 Bronze','鎏金銅 Gilt-Bronze','合金/天鐵 Alloy/Thochas','包金 Gold-Inlaid','純金 Gold'],
    形制_器形: ['尊 Zun','爵 Jue','鼎 Ding','鬲 Li','斝 Jia','卣 You','壺 Vessel','觶 Zhi','鐘 Bell','劍 Sword','缶 Fou','盤 Pan','鏡 Mirror','佛像 Statue','菩薩像 Bodhisattva','普巴杵 Purba','金剛杵 Dorje','文鎮 Paperweight','虎形鎮 Tiger Weight','博山爐 Boshan Censer','帶鉤 Belt Hook'],
    材質: ['黃銅_Brass','紅銅_Copper','白銅_White copper','青銅_Bronze','鉛_Lead','錫_Tin','鐵_Iron','銀_Silver','鎏金_Gold-Gilted','鍍金_Gold-Palted','合金_Alloy'],
    顯微特徵: ['酸蝕黑','染色','膠膜','乾淨勻稱','拋磨','金屬交角','皺褶老化','蝕孔','土結晶'],
    說明A: ['本物件經顯微及元素分析後','並未偵測到現代的加工殘留諸如染色、酸蝕等','主體材質為$$，元素組成符合古銅器製作用料','主體材質為青銅(Cu、Sn、Pb)合金','並含有多樣微量金屬元素','本件亦含有微量貴金屬金、銀（Au、Ág）','符合古代$$典型製作特徵','主胎體成分為$$，占比約/逾$$','另胎體成分亦含$$佔比約$$','未見惰性貴金屬等成分，卻未有符合年代的鏽蝕或老化表現','同時偵測到酸蝕、染色、矽膠膜的殘留','含有較高比例的工業用料/輻射元素','與古代金屬製作用料並不吻合','與古佛像法器製作用料顯著不同'],
    說明B: ['顯微觀測下','可見多層次鏽蝕、自然老化','以及漸進沁變、蝕孔等特徵','且具典型古金屬冶煉之交角結構','亦可見沉積類特徵，可能曾窖藏或入塔','胎底/露胎處細密均質','金屬胎體依然黃澄鮮亮，缺乏鏽蝕','凹陷處深色堆積，乃酸蝕所致生','深褐污漬多見浮於器表','器表可見高速細密的平行拋痕，乃現代機械工痕','多屬作舊手法'],
    說明C: ['綜觀前述跡證','本件應為商代(B.C.17th～11th )時期之古青銅器','本件應為商代晚期(B.C.14th～11th)之古青銅器','本件應為西周(B.C.11th～8th)時期之古青銅器','本件應為商代晚期(B.C.10th～8th)之古青銅器','本件應為東周時期(B.C.8th～3th)之古青銅器','本件應為春秋時期(B.C.8th～5th)之古銅器','本件應為戰國時期(B.C.5th～3th)之古銅器','本件應為漢至六朝時期(B.C.2th～A.D.6th)之古銅器','本件應為魏晉南北朝(A.D.6th～6th)時期之古銅器','本件應為隋唐時期(A.D.6th～10th)之古銅器','本件應為宋代(A.D.10th～13th)時期之古銅器','本件應為明代(A.D.14th～17th)時期之古銅器','本件應為清代(A.D.17th～19th)時期之古銅器','本件應為清代晚期(A.D.19th～20th)之古銅器','本件為近代仿品','本件為現代新製品'],
  },
  瓷器: {
    形制_朝代: ['新石器 Neolithic','漢代 Han','唐代 Tang','晉朝 Jin','五代 Five Dyn.','宋代 Song','遼金 LiaoJin','金元 JingYuan','元代 Yuan','明代 Ming','清代 Qing','民國 Republic'],
    形制_紋飾: ['無 None','仿釉 Imitation','青花 Blue and White','青瓷 Celadon','汝窯 Ru Ware','哥窯 Ge Ware','官窯 Guan Ware','定窯 Ding Ware','白瓷 White Glaze','黑釉/建盞 Black/Tenmoku','釉裡紅 Underglaze Red','鈞窯 Jun Ware','鈞釉 Jun Glaze','哥釉 Ge Glaze','影青 Shadowy Blue','三彩 Sancai','五彩 Wucai','粉彩 Famille Rose','鬥彩 Doucai','琺瑯彩 Enamel','點彩 Tobi-seiji','茶葉末 Tea-dust Glaze','康熙 Kangxi','雍正 Yongzheng','乾隆 Qianlong','紅釉 Red Glaze','藍釉 Blue Glaze','黃釉 Yellow Glaze','越窯 Yue Ware','龍泉窯 Longquan Ware','建窯 Jian Ware','吉州窯 Jizhou Ware','景德鎮窯 Jingdezhen Ware','德化窯 Dehua Ware','長沙窯 Changsha Ware','龍紋 Dragon','鳳紋 Phoenix','纏枝花卉 Floral Scroll','折枝花果 Floral Spray','花鳥 Bird and Flower','魚藻紋 Fish and Algae','八吉祥 Eight Treasures','人物 Figure'],
    形制_器形: ['碗 Bowl','盤 Dish','杯 Cup','瓶 Vase','梅瓶 Meiping','玉壺春 Yuhuchun Vase','葫蘆瓶 Gourd Vase','罐 Jar','執壺 Ewer','壺 Teapot','爐 Incense Burner','洗 Washer','盂 Pot','盆 Flower Pot','枕 Pillow','造像 Figurine','蓋盒 Box with Cover'],
    材質: ['單色釉瓷_Monochrome Porcelain','青花瓷_Blue&White Porcelain','釉里紅瓷_Underglaze-Red Porcelain','釉上彩瓷_Overglaze Porcelain','色釉瓷_Colored Porcelain','素色陶_Plain Earthenware','彩陶_Painted Pottery'],
    顯微特徵: ['足底顆粒','乾淨裂縫','乾淨氣泡','拋磨','舊氣泡/蝕孔','足底皺褶','枝狀結晶','內視鏡'],
    說明A: ['本物件經顯微及元素分析後','並未偵測到現代化合物的加工殘留','胎釉主成分其二氧化矽、氧化鈣(CaO)佔比高','含有較高比例的$$，符合此釉色氧化/還原之發色元素','然而主要發色元素氧化$$，占比過低','元素組成吻合所載$$窯之定性配比','胎釉成分缺乏古瓷常見的氧化鐵(Fe)、氧化錳(Mn)元素','器面有酸蝕物質的殘留','與古陶瓷製作用料顯著不同'],
    說明B: ['顯微觀測下','胎釉面具有自然風化、沉積、氣泡破損','以及礦物結晶析出/皺縮等特徵','足底/開片處亦可見老化沉積特徵','胎體可見枝狀皺縮與結晶','釉面銳挺、氣泡緻密完整','露胎處質地均勻鮮淨','開片處缺乏年代沉積/沉積僅見白淨泥質','足底處可見到許多白色顆粒，呈現高精度的正圓珠體','釉面雖具有點狀凹坑、磨損、開片等特徵','釉面有凹坑的殘留卻未沁入釉裏或氣泡','釉面凹陷/破損處,可見沾黏物質，','然污損多停於器表，沁入老化與器表特徵並不吻合','應為電窯墊燒粉或仿舊打磨的顆粒殘留','其氣泡樣態巨大瑩潤，以熱材料/熱力學原理難以見存於古柴窯之過程','多屬現代製陶工藝/作舊手法'],
    說明C: ['綜觀前述跡證','本件應為8~10世紀(A.D.10th)之唐代古陶瓷','本件應為9~11世紀(A.D.11th)之唐宋古陶瓷','本件應為11~12世紀(A.D.12th)之宋代窯口瓷器','本件應為11~13世紀(A.D.13th)之宋代窯口瓷器','本件應為2~10世紀(A.D.10th)之越窯瓷器','本件應為13~14世紀(A.D.14th)之元代瓷器','本件應為14~17世紀(A.D.17th)之明代瓷器','本件應為17~20世紀(A.D.20th)之清代瓷器','本件為西元前2世紀至1世紀(B.C.2nd~A.D.1st)之漢代陶器','本件為西元前5世紀至前1世紀(B.C.5th~2nd)之文化期陶器','本件為近代仿品','本件為現代新品'],
  },
  粉質佛牌: {
    師父出處: ['瓦拉康 Wat Rakang [WRK]','瓦給猜優 Wat Ket Chaiyo [WKY]','瓦曼坤蓬 Wat Bang Khun Prom [WBK]','瓦曼港 Wat BangKrang [WM]','阿贊多 Archan Toh [AT]','龍婆班 LP Ban [LPB]','龍婆多 LP Toh [LT]','龍婆 Boon LP Boon [LB]','龍普添 LP Tim [LTIM]','龍普托 LP Tuad [LTuad]','龍婆喬 LP Kaew [LK]','龍婆嚴 LP Eiam [LE]','龍婆蜀 LP Suk [LS]','龍婆凱 LP Kai [LKai]','龍婆貴 LP Kuay [LKY]','龍婆爹 LP Tae [LPTae]','龍婆空 LP Kron [LPKron]','龍婆銀 LP Ngern [LN]','龍婆炎 LP Yiam [LY]','瓦白欖 Wat Paknam [WP]','出塔 Unearthed [UE]','素可泰王朝 Sukhothai Dynasty [SD]','南奔出塔古佛 Unearthed Lamphun [ULP]','瓦嘎朗空 Wat Klang Khlong [WK]'],
    形制: ['崇迪 Somdej [SD]','帕古曼坤平Kuman Kunpaen [KK]','菩提葉崇迪 Bodhi.L Somdej [BS]','珍寶必打 Jumbo Pitda [JP]','神獸崇迪 Somdej [S]','小立尊 Roop Lor [RL]','自身像 Coin [C]','必打 Pidta [PD]','坤平 Khun Paen [KP]','女王佛 Nang Phaya [NP]','頌扣佛 Phra Soom Kor [SK]','帕洛佛 Phra Rod [PR]','帕蓬素潘 Phra Phong Suphan [PSP]','古曼童 Kuman Thong [KT]','招財女神 Nang Kwak [NK]','佛祖 Buddha [B]','立姿佛像 Standing Buddha [SB]'],
    期數紀年: ['無 None []','一期 1st [1st]','二期 2nd [2nd]','三期 3rd [3rd]','第四期 4th [4th]','2515 年 2515 [2515]','2497 年 2497 [2497]','2460 年 2460 [2460]','波尼 Plod Nee [PN]','理事版 Kamakan [K]','鎏金版 Gilded [G]','特殊模 Special Variant [S]','復古模 Retro [RB]','粉質 Powder Based [P]'],
    材質: ['石膏凝固物_Plaster Mixture','水泥_Cement','泥質_Clay','有機_Organic','石灰_Lime','含矽凝固物_Silicon','混合物_Mixture'],
    顯微特徵: ['做舊深色','鮮豔染色','乾淨','符管酸蝕','漸層擴散','半透潤澤','蝕孔','斑駁皺摺'],
    說明A: ['本物件經顯微及元素分析後','並未偵測到現代的加工殘留諸如染色、酸蝕等','同時元素組成符合古代佛牌製作用料，含有多種礦物質及微量金屬元素','本件含有微量貴金屬金銀鉑（Au、Ag、Pt）','主胎體成分為$$，占比約/逾$$','同時偵測到酸蝕、染色、矽膠膜的殘留','與龍婆$$製作用料並不吻合','與古佛牌製作用料顯著不同'],
    說明B: ['顯微觀測下','可見沁潤、半透脂化、自然漸進老化','以及龜裂、蝕孔等特徵','亦可見沉積類特徵，可能曾窖藏或入塔','胎體可見枝狀皺縮與結晶','胎體白皙細緻','深褐污漬多見浮於器表','露胎處質地均勻','多屬作舊手法','(*註：本件經過清刷留有部分拋痕)','(*本件鑲嵌符管或金箔乃早期純金(Au)'],
    說明C: ['綜觀前述跡證','本件應為19世紀(A.D.19th)中晚期之古老佛牌，距今逾百年','本件應為20世紀(A.D.20th)早期之古老佛牌，距今約百年','本件應為20世紀(A.D.20th)中晚期之佛牌','本件應為16~17世紀以前(A.D.16~17th)之古老佛牌','本件乃近代出塔之早期佛牌','本件為近代仿品','本件為現代新品','本件或為近代其他師父之製品'],
  },
  金屬佛牌: {
    師傅出處: ['龍婆銀 LP Ngern [LN]','龍婆 Boon LP Boon [LB]','龍婆蜀 LP Suk [LS]','龍普托 LP Tuad [LT]','龍婆登 LP Doem [LD]','龍婆敢 LP Klan [LK]','龍婆嚴 LP Yiam [LY]','龍婆空 LP Kong [LKo]','龍婆翠 LP Chui [LC]','龍婆貴 LP Kuay [LKu]','龍婆丹 LP Daeng [LDa]','龍婆碰 LP Phrom [LP]','龍婆凱 LP Khai [LKh]','龍婆他 LP Ta [LTa]','龍婆塔 LP Thap [LTh]','龍婆添 LP Tim [LTI]','古巴洗威猜 Kruba Sriwichai [KBS]','阿贊興 Archan Heng [AH]','阿贊多 Archan Toh [AT]','玉佛寺 Wat Phra Kaew [WPK]','南奔出塔古佛 Unearthed Lamphun [ULP]','三寶公寺 Wat Phananchoeng [WPC]','藏傳系列 Tibetan Series [TIB]','包瓦列 Pawaret [PW]','瓦蘇泰 Wat Suthat [ST]','山卡拉培 Sankara Phae [SK]'],
    形制: ['財佛小立尊 Roop Lor [R]','財佛大鋤頭 L.Spade Medal [LS]','財佛小鋤頭 S.Spade Medal [SS]','座山 Chaosua [CS]','小佛祖 Small Buddha [SB]','自身立尊 Portrait Statue [PS]','自身像 Portrait Medal [PM]','橢圓形自身 Oval Portrait [OP]','藥師佛 Phra Kring [PK]','成功佛 Phra Chinnarat [PC]','必打 Pidta [PD]','崇迪 Somdej [SD]','四面神 Phra Prom [PP]','哈魯曼 Hanuman [HM]','普巴杵 Purba [PB]','金剛杵 Dorje [DJ]'],
    期數: ['無 None','金屬/混合金屬 Metal/Alloy [M]','2505 期 2505 Batch [2505]','2503 期 2503 Batch [2503]','2485 印度支那 2485 Indochine [2485]','一期 1st [1st]','二期 2nd [2nd]','座山 Chaosua [CS]','出塔 Unearthed [UN]','麥卡錫 Mekasit [MKS]','索羅依蒙 Solot [SL]','九寶銅 Nawaloho [NA]','天鐵/合金 Thochas Alloy [TC]'],
    材質: ['黃銅_Brass','紅銅_Copper','白銅_White copper','青銅_Bronze','鉛_Lead','錫_Tin','鐵_Iron','銀_Silver','鎏金_Gold-Gilted','鍍金_Gold-Palted','合金_Alloy','銻_Antimony'],
    顯微特徵: ['酸蝕黑','染色','膠膜','乾淨勻稱','拋磨','金屬交角','皺褶老化','蝕孔','結晶'],
    說明A: ['本物件經顯微及元素分析後','並未偵測到現代的加工殘留諸如染色、酸蝕等','主體材質為$$，元素組成符合古佛牌製作用料','並含有多樣微量金屬元素','本件亦含有微量貴金屬金、銀、鉑（Au、Ag、Pt）','符合龍婆$$典型製作特徵','主胎體成分為$$，占比約/逾$$','同時偵測到酸蝕、染色、矽膠膜的殘留','含有較高比例的工業用料/輻射元素','與龍婆$$製作用料並不吻合','與古佛牌製作用料顯著不同'],
    說明B: ['顯微觀測下','可見多層次鏽蝕、自然老化','以及漸進沁變、蝕孔等特徵','且具典型古金屬冶煉之交角結構','亦可見沉積類特徵，可能曾窖藏或入塔','胎底/露胎處細密均質','金屬胎體依然黃澄鮮亮，缺乏鏽蝕','凹陷處深色堆積，乃酸蝕所致生','深褐污漬多見浮於器表','器表可見高速細密的平行拋痕，乃現代機械工痕','多屬作舊手法'],
    說明C: ['綜觀前述跡證','本件應為19世紀(A.D.19th)中晚期之古老佛牌，距今逾百年','本件應為20世紀(A.D.20th)早期之古老佛牌，距今約百年','本件應為20世紀(A.D.20th)中晚期之佛牌','本件應為16~17世紀以前(A.D.16~17th)之古老佛牌','本件為近代仿品','本件為現代新品','本件或為近代其他師父之製品'],
  },
}

export type GenuinePreset = {
  buildingType?: BuildingType
  resultType: 'CC' | 'RC'
}

export const GENUINE_PRESETS: Record<string, GenuinePreset> = {
  '瓦拉康崇迪':        { buildingType: '粉質佛牌', resultType: 'CC' },
  '瓦給猜優女王佛':    { buildingType: '粉質佛牌', resultType: 'CC' },
  '龍婆班神獸崇迪':    { buildingType: '粉質佛牌', resultType: 'CC' },
  '龍婆炎神獸崇迪':    { buildingType: '粉質佛牌', resultType: 'CC' },
  '財佛小立尊':        { buildingType: '金屬佛牌', resultType: 'CC' },
  '財佛大鋤頭':        { buildingType: '金屬佛牌', resultType: 'CC' },
  '龍婆銀財佛':        { buildingType: '金屬佛牌', resultType: 'RC' },
  '龍婆蜀財佛':        { buildingType: '金屬佛牌', resultType: 'RC' },
}

export const OPERATORS = ['所長', '助理A', '助理B', '助理C']
