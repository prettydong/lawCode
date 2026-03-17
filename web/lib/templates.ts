// 民事起诉状模板注册表
// 每个模板描述其类别、名称、表单 schema

export interface TemplateField {
    key: string;       // 字段 key（对应 JSON data）
    label: string;     // 显示标签
    type: "text" | "textarea" | "radio" | "date" | "group";
    options?: string[];  // radio 类型的选项
    placeholder?: string;
    fields?: TemplateField[];  // group 类型的子字段
    span?: number;  // 1 or 2 (col span)
}

export interface TemplateSection {
    title: string;
    fields: TemplateField[];
}

export interface CivilTemplate {
    id: string;         // e.g. "009"
    dirName: string;    // 模板目录名
    name: string;       // 显示名称
    subtitle: string;   // 副标题
    desc: string;       // 描述
    category: string;   // 分类
    tags: string[];     // 搜索标签
    pages: number;      // 页数
    available: boolean; // 是否可用
}

// 当事人信息通用 schema（原告自然人）
const PERSON_NATURAL_FIELDS: TemplateField[] = [
    { key: "姓名", label: "姓名", type: "text" },
    { key: "性别", label: "性别", type: "radio", options: ["男", "女"] },
    { key: "出生年", label: "出生年", type: "text", placeholder: "如：1990" },
    { key: "出生月", label: "出生月", type: "text", placeholder: "如：6" },
    { key: "出生日", label: "出生日", type: "text", placeholder: "如：15" },
    { key: "民族", label: "民族", type: "text", placeholder: "如：汉族" },
    { key: "工作单位", label: "工作单位", type: "text" },
    { key: "职务", label: "职务", type: "text" },
    { key: "联系电话", label: "联系电话", type: "text" },
    { key: "住所地（户籍所在地）", label: "住所地（户籍所在地）", type: "text", span: 2 },
    { key: "经常居住地", label: "经常居住地", type: "text", span: 2 },
    { key: "证件类型", label: "证件类型", type: "text", placeholder: "如：居民身份证" },
    { key: "证件号码", label: "证件号码", type: "text", span: 2 },
];

const AGENT_FIELDS: TemplateField[] = [
    { key: "有无", label: "是否有委托诉讼代理人", type: "radio", options: ["有", "无"] },
    { key: "姓名", label: "姓名", type: "text" },
    { key: "单位", label: "单位", type: "text" },
    { key: "职务", label: "职务", type: "text" },
    { key: "联系电话", label: "联系电话", type: "text" },
    { key: "代理权限", label: "代理权限", type: "radio", options: ["一般授权", "特别授权"] },
];

// 通用表单 sections（所有民事起诉状共享的部分）
export const COMMON_SECTIONS: TemplateSection[] = [
    {
        title: "原告信息",
        fields: PERSON_NATURAL_FIELDS,
    },
    {
        title: "委托诉讼代理人",
        fields: AGENT_FIELDS,
    },
    {
        title: "被告信息",
        fields: PERSON_NATURAL_FIELDS,
    },
    {
        title: "事实与理由",
        fields: [
            { key: "_自由文本", label: "事实与理由（自由书写）", type: "textarea", span: 2, placeholder: "请详细描述纠纷涉及的事实与理由..." },
        ],
    },
];

// 所有民事起诉状模板列表
export const CIVIL_TEMPLATES: CivilTemplate[] = [
    // ─── 婚姻家庭 ───
    { id: "009", dirName: "009_离婚纠纷民事起诉状", name: "民事起诉状（离婚纠纷）", subtitle: "离婚纠纷", desc: "适用于离婚纠纷案件，含财产分割、子女抚养等", category: "婚姻家庭", tags: ["离婚", "婚姻", "抚养", "财产分割"], pages: 4, available: true },
    // ─── 合同纠纷 ───
    { id: "011", dirName: "011_买卖合同纠纷民事起诉状", name: "民事起诉状（买卖合同纠纷）", subtitle: "买卖合同纠纷", desc: "适用于买卖合同违约纠纷", category: "合同纠纷", tags: ["买卖", "合同", "违约", "货款"], pages: 5, available: true },
    { id: "013", dirName: "013_房屋买卖合同纠纷民事起诉状", name: "民事起诉状（房屋买卖合同纠纷）", subtitle: "房屋买卖合同纠纷", desc: "适用于房屋买卖合同纠纷", category: "合同纠纷", tags: ["房屋", "买卖", "合同", "不动产"], pages: 5, available: true },
    { id: "015", dirName: "015_金融借款合同纠纷民事起诉状", name: "民事起诉状（金融借款合同纠纷）", subtitle: "金融借款合同纠纷", desc: "适用于银行等金融机构借款合同纠纷", category: "合同纠纷", tags: ["金融", "借款", "银行", "贷款"], pages: 5, available: true },
    { id: "017", dirName: "017_民间借贷纠纷民事起诉状", name: "民事起诉状（民间借贷纠纷）", subtitle: "民间借贷纠纷", desc: "适用于个人之间的借贷纠纷", category: "合同纠纷", tags: ["民间", "借贷", "借条", "欠款"], pages: 5, available: true },
    { id: "019", dirName: "019_信用卡纠纷民事起诉状", name: "民事起诉状（信用卡纠纷）", subtitle: "信用卡纠纷", desc: "适用于信用卡透支、催收等纠纷", category: "合同纠纷", tags: ["信用卡", "透支", "银行", "催收"], pages: 5, available: true },
    { id: "021", dirName: "021_房屋租赁合同纠纷民事起诉状", name: "民事起诉状（房屋租赁合同纠纷）", subtitle: "房屋租赁合同纠纷", desc: "适用于房屋租赁合同纠纷", category: "合同纠纷", tags: ["房屋", "租赁", "合同", "租金"], pages: 5, available: true },
    { id: "023", dirName: "023_融资租赁合同纠纷民事起诉状", name: "民事起诉状（融资租赁合同纠纷）", subtitle: "融资租赁合同纠纷", desc: "适用于融资租赁合同纠纷", category: "合同纠纷", tags: ["融资", "租赁", "合同"], pages: 5, available: true },
    { id: "025", dirName: "025_建设工程施工合同纠纷民事起诉状", name: "民事起诉状（建设工程施工合同纠纷）", subtitle: "建设工程施工合同纠纷", desc: "适用于建设工程施工合同纠纷", category: "合同纠纷", tags: ["建设工程", "施工", "合同", "工程款"], pages: 5, available: true },
    { id: "027", dirName: "027_物业服务合同纠纷民事起诉状", name: "民事起诉状（物业服务合同纠纷）", subtitle: "物业服务合同纠纷", desc: "适用于物业服务合同纠纷", category: "合同纠纷", tags: ["物业", "服务", "合同", "物业费"], pages: 5, available: true },
    { id: "029", dirName: "029_劳动争议纠纷民事起诉状", name: "民事起诉状（劳动争议纠纷）", subtitle: "劳动争议纠纷", desc: "适用于劳动争议纠纷", category: "合同纠纷", tags: ["劳动", "争议", "工资", "解雇", "社保"], pages: 5, available: true },
    // ─── 证券保险 ───
    { id: "031", dirName: "031_证券虚假陈述责任纠纷民事起诉状", name: "民事起诉状（证券虚假陈述责任纠纷）", subtitle: "证券虚假陈述责任纠纷", desc: "适用于证券虚假陈述相关纠纷", category: "证券保险", tags: ["证券", "虚假陈述", "股票", "投资"], pages: 6, available: true },
    { id: "033", dirName: "033_财产损失保险合同纠纷民事起诉状", name: "民事起诉状（财产损失保险合同纠纷）", subtitle: "财产损失保险合同纠纷", desc: "适用于财产保险理赔纠纷", category: "证券保险", tags: ["保险", "财产", "理赔", "合同"], pages: 5, available: true },
    { id: "035", dirName: "035_责任保险合同纠纷民事起诉状", name: "民事起诉状（责任保险合同纠纷）", subtitle: "责任保险合同纠纷", desc: "适用于责任保险合同纠纷", category: "证券保险", tags: ["保险", "责任", "理赔", "合同"], pages: 5, available: true },
    { id: "037", dirName: "037_保证保险合同纠纷民事起诉状", name: "民事起诉状（保证保险合同纠纷）", subtitle: "保证保险合同纠纷", desc: "适用于保证保险合同纠纷", category: "证券保险", tags: ["保险", "保证", "合同"], pages: 5, available: true },
    { id: "039", dirName: "039_人身保险合同纠纷民事起诉状", name: "民事起诉状（人身保险合同纠纷）", subtitle: "人身保险合同纠纷", desc: "适用于人身保险合同纠纷", category: "证券保险", tags: ["保险", "人身", "理赔", "合同"], pages: 5, available: true },
    { id: "041", dirName: "041_机动车交通事故责任纠纷民事起诉状", name: "民事起诉状（机动车交通事故责任纠纷）", subtitle: "机动车交通事故责任纠纷", desc: "适用于交通事故侵权纠纷", category: "证券保险", tags: ["交通事故", "机动车", "侵权", "赔偿"], pages: 6, available: true },
    // ─── 知识产权 ───
    { id: "043", dirName: "043_侵害著作权及邻接权纠纷民事起诉状", name: "民事起诉状（侵害著作权及邻接权纠纷）", subtitle: "侵害著作权及邻接权纠纷", desc: "适用于著作权侵权纠纷", category: "知识产权", tags: ["著作权", "版权", "侵权", "知识产权"], pages: 6, available: true },
    { id: "045", dirName: "045_侵害商标权纠纷民事起诉状", name: "民事起诉状（侵害商标权纠纷）", subtitle: "侵害商标权纠纷", desc: "适用于商标权侵权纠纷", category: "知识产权", tags: ["商标", "侵权", "知识产权"], pages: 6, available: true },
    { id: "047", dirName: "047_侵害发明专利权纠纷民事起诉状", name: "民事起诉状（侵害发明专利权纠纷）", subtitle: "侵害发明专利权纠纷", desc: "适用于发明专利权侵权纠纷", category: "知识产权", tags: ["专利", "发明", "侵权", "知识产权"], pages: 7, available: true },
    { id: "049", dirName: "049_侵害外观设计专利权纠纷民事起诉状", name: "民事起诉状（侵害外观设计专利权纠纷）", subtitle: "侵害外观设计专利权纠纷", desc: "适用于外观设计专利权侵权纠纷", category: "知识产权", tags: ["专利", "外观设计", "侵权"], pages: 6, available: true },
    { id: "051", dirName: "051_侵害植物新品种权纠纷民事起诉状", name: "民事起诉状（侵害植物新品种权纠纷）", subtitle: "侵害植物新品种权纠纷", desc: "适用于植物新品种权侵权纠纷", category: "知识产权", tags: ["植物", "品种权", "侵权"], pages: 6, available: true },
    { id: "053", dirName: "053_侵害商业秘密纠纷民事起诉状", name: "民事起诉状（侵害商业秘密纠纷）", subtitle: "侵害商业秘密纠纷", desc: "适用于商业秘密侵权纠纷", category: "知识产权", tags: ["商业秘密", "侵权", "知识产权"], pages: 6, available: true },
    { id: "055", dirName: "055_技术合同纠纷民事起诉状", name: "民事起诉状（技术合同纠纷）", subtitle: "技术合同纠纷", desc: "适用于技术合同纠纷", category: "知识产权", tags: ["技术", "合同", "知识产权"], pages: 5, available: true },
    { id: "057", dirName: "057_不正当竞争纠纷民事起诉状", name: "民事起诉状（不正当竞争纠纷）", subtitle: "不正当竞争纠纷", desc: "适用于不正当竞争纠纷", category: "知识产权", tags: ["不正当竞争", "侵权"], pages: 6, available: true },
    { id: "059", dirName: "059_垄断纠纷民事起诉状", name: "民事起诉状（垄断纠纷）", subtitle: "垄断纠纷", desc: "适用于垄断纠纷案件", category: "知识产权", tags: ["垄断", "反垄断", "竞争"], pages: 10, available: true },
    // ─── 海事海商 ───
    { id: "073", dirName: "073_船舶碰撞损害责任纠纷民事起诉状", name: "民事起诉状（船舶碰撞损害责任纠纷）", subtitle: "船舶碰撞损害责任纠纷", desc: "适用于船舶碰撞损害赔偿纠纷", category: "海事海商", tags: ["海事", "船舶", "碰撞", "赔偿"], pages: 9, available: true },
    { id: "075", dirName: "075_海上、通海水域人身损害责任纠纷民事起诉状", name: "民事起诉状（海上人身损害责任纠纷）", subtitle: "海上、通海水域人身损害责任纠纷", desc: "适用于海上人身伤亡赔偿纠纷", category: "海事海商", tags: ["海事", "人身损害", "赔偿"], pages: 8, available: true },
    { id: "077", dirName: "077_海上、通海水域货运代理合同纠纷民事起诉状", name: "民事起诉状（海上货运代理合同纠纷）", subtitle: "海上、通海水域货运代理合同纠纷", desc: "适用于海上货运代理合同纠纷", category: "海事海商", tags: ["海事", "货运", "代理", "合同"], pages: 5, available: true },
    { id: "079", dirName: "079_船员劳务合同纠纷民事起诉状", name: "民事起诉状（船员劳务合同纠纷）", subtitle: "船员劳务合同纠纷", desc: "适用于船员劳务合同纠纷", category: "海事海商", tags: ["海事", "船员", "劳务", "合同"], pages: 7, available: true },
    // ─── 环境公益 ───
    { id: "081", dirName: "081_环境污染民事公益诉讼民事起诉状", name: "民事起诉状（环境污染民事公益诉讼）", subtitle: "环境污染民事公益诉讼", desc: "适用于环境污染公益诉讼", category: "环境公益", tags: ["环境", "污染", "公益", "诉讼"], pages: 4, available: true },
    { id: "083", dirName: "083_生态破坏民事公益诉讼民事起诉状", name: "民事起诉状（生态破坏民事公益诉讼）", subtitle: "生态破坏民事公益诉讼", desc: "适用于生态破坏公益诉讼", category: "环境公益", tags: ["生态", "破坏", "公益", "诉讼"], pages: 4, available: true },
    { id: "085", dirName: "085_生态环境损害赔偿诉讼民事起诉状", name: "民事起诉状（生态环境损害赔偿诉讼）", subtitle: "生态环境损害赔偿诉讼", desc: "适用于生态环境损害赔偿诉讼", category: "环境公益", tags: ["生态", "环境", "损害赔偿", "诉讼"], pages: 4, available: true },
];

// 所有分类
export const CATEGORIES = [
    "全部",
    "婚姻家庭",
    "合同纠纷",
    "证券保险",
    "知识产权",
    "海事海商",
    "环境公益",
];
