#!/usr/bin/env python3
"""
通用民事起诉状生成器：读取任意民事起诉状 .tex 模板 + JSON 表单数据，
通过字符串替换填入数据后编译生成 PDF。

用法:
    python3 generate_civil.py --template <模板目录> --data <数据JSON> --output <输出PDF>

核心思路：
  所有民事起诉状共享 \\pairsection{标签}{内容} 结构。
  generate.py 解析 JSON 中的字段数据，用精确字符串匹配替换 .tex 中的
  空白字段（如 "姓名：" → "姓名：张三"），将 $\\square$ 替换为勾选/未勾选。
"""

import json
import os
import re
import sys
import subprocess
import shutil
import tempfile
import argparse

# ============================================================
# LaTeX 常量
# ============================================================
CHECKED = r"\rlap{\kern0.18em\raisebox{0.17ex}{\scalebox{0.78}{$\checkmark$}}}$\square$"
UNCHECKED = r"$\square$"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
COMMON_TEMPLATE_DIR = os.path.join(SCRIPT_DIR, "common")
FILLABLE_INPUT_BASENAMES = {"mediation", "party_agent", "party_natural", "party_org"}


# ============================================================
# 工具函数
# ============================================================

def extract_party_block(tex: str, role: str, block_type: str) -> tuple:
    """
    从模板中提取指定角色的指定类型区块内容（含标记行）。
    返回 (block_start, block_end, block_content_without_markers)
    如果未找到标记，返回 (-1, -1, None)
    """
    begin_marker = f"% BEGIN:{role}_{block_type}"
    end_marker = f"% END:{role}_{block_type}"
    
    begin_pos = tex.find(begin_marker)
    if begin_pos == -1:
        return (-1, -1, None)
    
    end_pos = tex.find(end_marker, begin_pos)
    if end_pos == -1:
        return (-1, -1, None)
    
    # 整个区块范围（含标记行）
    line_start = tex.rfind('\n', 0, begin_pos)
    line_start = line_start + 1 if line_start != -1 else 0
    
    line_end = tex.find('\n', end_pos)
    line_end = line_end + 1 if line_end != -1 else len(tex)
    
    # 提取标记之间的内容（不含标记行本身）
    content_start = tex.find('\n', begin_pos)
    content_start = content_start + 1 if content_start != -1 else begin_pos
    
    content_end = tex.rfind('\n', 0, end_pos)
    content_end = content_end + 1 if content_end > content_start else content_start
    
    content = tex[content_start:content_end]
    
    return (line_start, line_end, content)


def normalize_party_data(parties: dict) -> dict:
    """
    将当事人数据标准化为数组格式。
    兼容旧格式（单个 dict）→ 包装为 [dict]
    """
    result = {}
    for role in ["原告", "被告", "第三人"]:
        val = parties.get(role)
        if val is None:
            result[role] = []
        elif isinstance(val, list):
            result[role] = val
        elif isinstance(val, dict):
            # 旧格式兼容：单个 dict → [dict]
            result[role] = [val]
        else:
            result[role] = []
    # 保留其他字段（如委托诉讼代理人）
    for k, v in parties.items():
        if k not in result:
            result[k] = v
    return result


def fill_block_natural(block: str, person: dict) -> str:
    """填充一个自然人模板片段的字段并返回。"""
    section = block
    g = person.get("性别", "")
    if g:
        section = section.replace("男$\\square$", f"男{cb(g=='男')}")
        section = section.replace("女$\\square$", f"女{cb(g=='女')}")
    
    for label in ["姓名", "民族", "工作单位", "职务", "联系电话",
                   "住所地（户籍所在地）", "经常居住地", "证件类型", "证件号码"]:
        val = person.get(label, "")
        if val:
            old_pattern = label + "："
            idx = section.find(old_pattern)
            if idx != -1:
                end_idx = idx + len(old_pattern)
                section = section[:end_idx] + escape_latex(val) + section[end_idx:]
    
    by = person.get("出生年", "")
    bm = person.get("出生月", "")
    bd = person.get("出生日", "")
    if by or bm or bd:
        section = section.replace(
            "出生日期：\\hspace{2em}年\\hspace{2em}月\\hspace{2em}日",
            f"出生日期：{by}年{bm}月{bd}日"
        )
    return section


def fill_block_org(block: str, org: dict) -> str:
    """填充一个组织模板片段的字段并返回。"""
    section = block
    for label in ["名称", "住所地（主要办事机构所在地）", "注册地 / 登记地",
                   "法定代表人 / 负责人", "职务", "联系电话",
                   "统一社会信用代码"]:
        val = org.get(label, "")
        if val:
            old_pattern = label + "："
            idx = section.find(old_pattern)
            if idx != -1:
                end_idx = idx + len(old_pattern)
                section = section[:end_idx] + escape_latex(val) + section[end_idx:]
    
    org_type = org.get("类型", "")
    if org_type:
        type_options = [
            "有限责任公司", "股份有限公司", "上市公司",
            "其他企业法人", "事业单位", "社会团体", "基金会",
            "社会服务机构", "机关法人", "农村集体经济组织法人",
            "城镇农村的合作经济组织法人", "基层群众性自治组织法人",
            "个人独资企业", "合伙企业", "不具有法人资格的专业服务机构",
        ]
        for opt in type_options:
            old = opt + "$\\square$"
            new = opt + (CHECKED if opt == org_type else UNCHECKED)
            section = section.replace(old, new, 1)
    
    ownership = org.get("所有制性质", "")
    if ownership:
        for opt in ["国有", "民营"]:
            old = opt + "$\\square$"
            new = opt + (CHECKED if opt == ownership else UNCHECKED)
            section = section.replace(old, new, 1)
        if ownership == "国有":
            sub = org.get("国有类型", "")
            if sub:
                for opt in ["控股", "参股"]:
                    old = opt + "$\\square$"
                    new = opt + (CHECKED if opt == sub else UNCHECKED)
                    section = section.replace(old, new, 1)
    
    other_own = org.get("其他所有制", "")
    if other_own:
        section = section.replace(
            "其他\\rule{60bp}{0.5pt}",
            f"其他{escape_latex(other_own)}"
        )
    return section


def expand_party_blocks(tex: str, data: dict) -> str:
    """
    根据数据中各角色的实体数组，动态复制并填充模板区块。
    
    支持多个自然人、多个组织。
    如果数据为空或无标记，保留原始模板（不做任何修改）。
    """
    parties = data.get("当事人信息", {})
    parties = normalize_party_data(parties)
    
    for role in ["原告", "被告", "第三人"]:
        entities = parties.get(role, [])
        if not entities:
            continue  # 无数据，保留空白模板
        
        # 提取自然人和组织的模板片段
        nat_start, nat_end, nat_template = extract_party_block(tex, role, "自然人")
        org_start, org_end, org_template = extract_party_block(tex, role, "组织")
        
        if nat_template is None and org_template is None:
            # 无标记（如 009 离婚），走旧的单实体逻辑
            entity = entities[0]
            tex = fill_role_natural(tex, role, entity)
            continue
        
        # 分类实体
        nat_entities = [e for e in entities if e.get("_类型", "自然人") == "自然人"]
        org_entities = [e for e in entities if e.get("_类型") == "组织"]
        
        # 生成所有填充后的区块
        filled_blocks = []
        
        for entity in nat_entities:
            if nat_template:
                filled_blocks.append(fill_block_natural(nat_template, entity))
        
        for entity in org_entities:
            if org_template:
                filled_blocks.append(fill_block_org(org_template, entity))
        
        if not filled_blocks:
            # 没有匹配的实体，保留空白模板
            continue
        
        # 计算替换范围（从第一个标记到最后一个标记）
        # 需要重新提取位置（因为可能两个标记紧挨着）
        nat_start2, nat_end2, _ = extract_party_block(tex, role, "自然人")
        org_start2, org_end2, _ = extract_party_block(tex, role, "组织")
        
        positions = []
        if nat_start2 != -1:
            positions.append((nat_start2, nat_end2))
        if org_start2 != -1:
            positions.append((org_start2, org_end2))
        
        if not positions:
            continue
        
        replace_start = min(p[0] for p in positions)
        replace_end = max(p[1] for p in positions)
        
        # 用填充后的区块替换整个范围
        replacement = "\n".join(filled_blocks)
        tex = tex[:replace_start] + replacement + "\n" + tex[replace_end:]
    
    return tex

def escape_latex(text: str) -> str:
    """转义 LaTeX 特殊字符（保留中文标点）。"""
    if not text:
        return ""
    for char, repl in [('&', r'\&'), ('%', r'\%'), ('#', r'\#'),
                        ('_', r'\_'), ('~', r'\textasciitilde{}'),
                        ('^', r'\textasciicircum{}')]:
        text = text.replace(char, repl)
    return text


def cb(selected: bool) -> str:
    """返回勾选/未勾选 LaTeX 符号。"""
    return CHECKED if selected else UNCHECKED


def normalize_label(text: str) -> str:
    """统一标签比较规则，忽略 LaTeX 手动换行和多余空白。"""
    if not text:
        return ""
    text = text.replace("\\\\", "")
    text = re.sub(r"\s+", "", text)
    return text.strip()


def labels_match(template_label: str, payload_label: str) -> bool:
    """
    允许“短标题”匹配模板里的长标题。
    例如：
    - payload: 1. 合同的签订情况
    - template: 1. 合同的签订情况（名称、编号、签订时间、地点等）
    """
    if not template_label or not payload_label:
        return False
    if template_label == payload_label:
        return True
    return template_label.startswith(payload_label) or payload_label.startswith(template_label)


def compact_text(text: str) -> str:
    """将普通文本压缩为单行，避免把用户输入中的多余空白带进模板。"""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def normalize_match_text(text: str) -> str:
    """用于模糊匹配选项文本，尽量忽略 LaTeX 占位和格式命令。"""
    if not text:
        return ""
    text = re.sub(r"\\hspace\*?\{[^}]*\}", "", text)
    text = re.sub(r"\\rule\{[^}]*\}\{[^}]*\}", "", text)
    text = text.replace(CHECKED, "")
    text = text.replace(UNCHECKED, "")
    text = text.replace("\\\\", "")
    text = re.sub(r"\\[a-zA-Z]+", "", text)
    text = re.sub(r"[{}\s/（）()：:，。、“”\"'`·\-年月日某]", "", text)
    return text.strip()


def is_subsequence(shorter: str, longer: str) -> bool:
    """判断 shorter 是否为 longer 的字符子序列。"""
    if not shorter:
        return False
    index = 0
    for char in longer:
        if index < len(shorter) and char == shorter[index]:
            index += 1
    return index == len(shorter)


def option_text_matches(candidate: str, target: str) -> bool:
    """判断模板中的候选选项文本是否能匹配用户侧标签/值。"""
    left = normalize_match_text(candidate)
    right = normalize_match_text(target)
    if not left or not right:
        return False
    if left == right or left.startswith(right) or right.startswith(left):
        return True
    shorter, longer = (left, right) if len(left) <= len(right) else (right, left)
    if len(shorter) < 2:
        return False
    return is_subsequence(shorter, longer)


def render_structured_value(value) -> str:
    """
    将结构化 section 数据渲染为可直接放进 pairsection 内容的 LaTeX 文本。
    规则：
    - 字符串：原样转义
    - 布尔：是 / 否
    - dict：展开为多行“标签：值”
    """
    if value is None:
        return ""

    if isinstance(value, bool):
        return "是" if value else "否"

    if isinstance(value, str):
        return escape_latex(compact_text(value))

    if isinstance(value, (int, float)):
        return escape_latex(str(value))

    if isinstance(value, dict):
        lines = []
        for key, item in value.items():
            rendered = render_structured_value(item)
            if not rendered:
                continue
            label = escape_latex(compact_text(str(key)))
            if "\n" in rendered or "\\\\" in rendered:
                lines.append(f"{label}：")
                lines.append(rendered)
            else:
                lines.append(f"{label}：{rendered}")
        return "\\\\\n".join(lines)

    if isinstance(value, list):
        items = [render_structured_value(item) for item in value]
        items = [item for item in items if item]
        return "\\\\\n".join(items)

    return escape_latex(compact_text(str(value)))


def mark_option(body: str, option: str) -> tuple[str, bool]:
    """将 body 中某个 option 对应的方框勾上。"""
    if not option:
        return body, False

    escaped_option = escape_latex(compact_text(option))
    target = escaped_option + UNCHECKED
    replacement = escaped_option + CHECKED

    if target in body:
        return body.replace(target, replacement, 1), True

    line_pattern = re.compile(rf"([^\n]*?{re.escape(UNCHECKED)}[^\n]*)")
    for match in line_pattern.finditer(body):
        line = match.group(1)
        if not option_text_matches(line, option):
            continue
        line_checked = line.replace(UNCHECKED, CHECKED, 1)
        start, end = match.span(1)
        return body[:start] + line_checked + body[end:], True

    return body, False


def fill_after_marker(body: str, marker: str, value: str) -> tuple[str, bool]:
    """
    在 marker 后插入文本。
    典型场景：
    - 内容：
    - 具体情况：
    - 费用明细：
    - 其他$\square$：
    """
    if not marker or not value:
        return body, False

    pos = body.find(marker)
    if pos == -1:
        return body, False

    insert_at = pos + len(marker)
    return body[:insert_at] + value + body[insert_at:], True


def fill_scalar_body(body: str, key: str, value, field_type: str | None = None) -> str:
    """将单个字段值写回已有 body。"""
    if value in (None, "", False):
        return body

    rendered = render_structured_value(value)
    if not rendered:
        return body

    changed = False

    if field_type == "checkbox" and value is True:
        body, changed = mark_option(body, str(key))
    elif field_type == "radio" and isinstance(value, (str, bool)):
        selected = "是" if value is True else "否" if value is False else compact_text(str(value))
        if selected:
            body, changed = mark_option(body, selected)
    elif field_type is None and isinstance(value, str) and compact_text(str(value)) in {"是", "否"}:
        body, changed = mark_option(body, compact_text(str(value)))

    if not changed:
        for marker in [
            f"{escape_latex(compact_text(str(key)))}：",
            f"{escape_latex(compact_text(str(key)))}{UNCHECKED}：",
            f"{escape_latex(compact_text(str(key)))}{CHECKED}：",
        ]:
            body, changed = fill_after_marker(body, marker, rendered)
            if changed:
                break

    if not changed:
        normalized_key = compact_text(str(key))
        if "其他" in normalized_key:
            body, changed = mark_option(body, "其他")
            if changed:
                for marker in [f"其他{CHECKED}：", f"其他{UNCHECKED}：", "其他："]:
                    body, changed2 = fill_after_marker(body, marker, rendered)
                    if changed2:
                        changed = True
                        break

    if not changed:
        addition = f"{escape_latex(compact_text(str(key)))}：{rendered}"
        stripped = body.strip()
        if stripped in {r"\mbox{}", "\\mbox{}\n\\mbox{}", "\\mbox{}\n\\mbox{}\n"} or "\\mbox{}" in stripped:
            return addition
        return body.rstrip() + "\\\\\n" + addition

    return body


def fill_structured_body(body: str, data, field_types: dict | None = None) -> str:
    """
    在保留原模板区块结构的前提下，尽量把结构化数据写回 body：
    - 选项值：优先勾选模板里的 checkbox
    - 标签值：优先填到 “标签：” 或 “选项框：” 后面
    - 未命中的字段：追加到区块末尾，避免信息丢失
    """
    if not isinstance(data, dict):
        return fill_scalar_body(body, "", data, None)

    for key, value in data.items():
        field_type = None
        if field_types:
            field_type = field_types.get(normalize_label(str(key)))

        if isinstance(value, dict):
            body = fill_structured_body(body, value, field_types)
            continue

        body = fill_scalar_body(body, str(key), value, field_type)

    return body


def iter_section_blocks(tex: str):
    """
    迭代所有 \\pairsection / \\pairsectionleft 区块，返回：
    {
      "cmd": "...",
      "label": "...",
      "label_norm": "...",
      "block_start": int,
      "body_start": int,
      "body_end": int,
      "block_end": int,
    }
    """
    pos = 0
    commands = ["\\pairsectionleft{", "\\pairsection{"]

    while True:
        matches = []
        for cmd in commands:
            idx = tex.find(cmd, pos)
            if idx != -1:
                matches.append((idx, cmd))

        if not matches:
            break

        start, cmd = min(matches, key=lambda item: item[0])
        label_start = start + len(cmd)
        label_end = tex.find("}{", label_start)
        if label_end == -1:
            pos = label_start
            continue

        body_start = label_end + 2
        depth = 1
        cursor = body_start
        while cursor < len(tex) and depth > 0:
            char = tex[cursor]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
            cursor += 1

        if depth != 0:
            break

        label = tex[label_start:label_end]
        body_end = cursor - 1
        yield {
            "cmd": cmd,
            "label": label,
            "label_norm": normalize_label(label),
            "block_start": start,
            "body_start": body_start,
            "body_end": body_end,
            "block_end": cursor,
        }
        pos = cursor


def replace_section_body_by_label(tex: str, label: str, content: str, occurrence: int = 1) -> str:
    """
    用 content 替换第 occurrence 个匹配标签的 pairsection 内容。
    同时支持 \\pairsection 和 \\pairsectionleft。
    """
    target = normalize_label(label)
    if not target:
        return tex

    match_count = 0
    for block in iter_section_blocks(tex):
        if not labels_match(block["label_norm"], target):
            continue
        match_count += 1
        if match_count != occurrence:
            continue

        replacement = content if content else r"\mbox{}"
        return tex[:block["body_start"]] + replacement + tex[block["body_end"]:]

    return tex


def update_section_body_by_label(tex: str, label: str, updater, occurrence: int = 1) -> str:
    """
    用 updater(old_body) 更新第 occurrence 个匹配标签的 pairsection 内容。
    """
    target = normalize_label(label)
    if not target:
        return tex

    match_count = 0
    for block in iter_section_blocks(tex):
        if not labels_match(block["label_norm"], target):
            continue
        match_count += 1
        if match_count != occurrence:
            continue

        old_body = tex[block["body_start"]:block["body_end"]]
        new_body = updater(old_body)
        return tex[:block["body_start"]] + new_body + tex[block["body_end"]:]

    return tex


def fill_structured_sections(tex: str, data: dict, field_types: dict | None = None) -> str:
    """
    将各 section 的结构化字段写入对应的 pairsection 区块。
    依赖前端按 schema label 发送 JSON。
    """
    occurrence_map = {}
    skip_keys = {"templateId", "templateName", "docId", "当事人信息"}

    for section_title, section_data in data.items():
        if section_title in skip_keys:
            continue
        if not isinstance(section_data, dict):
            continue

        for label, value in section_data.items():
            if label.startswith("_"):
                continue

            key = normalize_label(str(label))
            occurrence_map[key] = occurrence_map.get(key, 0) + 1
            tex = update_section_body_by_label(
                tex,
                str(label),
                lambda old_body, value=value, label=label: (
                    fill_structured_body(old_body, value, field_types)
                    if isinstance(value, dict)
                    else fill_scalar_body(old_body, str(label), value, field_types.get(key) if field_types else None)
                ),
                occurrence_map[key],
            )

    return tex


def set_explicit_option(line: str, selected: str, options: list[str]) -> str:
    """在单行中显式设置一组选项的勾选状态。"""
    result = line
    for option in options:
        result = result.replace(option + CHECKED, option + UNCHECKED)
        result = result.replace(option + UNCHECKED, option + (CHECKED if option == selected else UNCHECKED))
    return result


def sort_numbered_items(items: dict) -> list[tuple[str, str]]:
    """按“1. / 2. / 3.”顺序输出 dict 项。"""
    def item_key(entry):
        match = re.match(r"\s*(\d+)\.", str(entry[0]))
        return int(match.group(1)) if match else 9999
    return sorted(items.items(), key=item_key)


def fill_mediation_sections(tex: str, data: dict) -> str:
    """
    专门处理 common/mediation。

    这段公共模板里存在多行重复的“了解 / 不了解”选项，单靠通用模糊匹配会
    把勾选落到错误的行上，因此这里按固定结构逐行处理。
    """
    mediation = data.get("调解意愿", {})
    if not isinstance(mediation, dict):
        return tex

    awareness = mediation.get("是否了解调解作为非诉讼纠纷解决方式")
    if awareness in {"了解", "不了解"}:
        tex = update_section_body_by_label(
            tex,
            "是否了解调解作为非诉讼纠纷解决方式，能及时、高效、低成本、不伤和气地解决纠纷",
            lambda old_body: set_explicit_option(old_body, awareness, ["了解", "不了解"]),
        )

    benefits = mediation.get("是否了解先行调解解决纠纷的好处", {})
    if isinstance(benefits, dict):
        ordered = [value for _, value in sort_numbered_items(benefits) if value in {"了解", "不了解"}]

        def update_benefits(old_body: str) -> str:
            if not ordered:
                return old_body
            lines = old_body.splitlines(keepends=True)
            index = 0
            for i, line in enumerate(lines):
                if "了解" in line and UNCHECKED in line and "不了解" in line:
                    if index >= len(ordered):
                        break
                    lines[i] = set_explicit_option(line, ordered[index], ["了解", "不了解"])
                    index += 1
            return "".join(lines)

        tex = update_section_body_by_label(tex, "是否了解先行调解解决纠纷的好处", update_benefits)

    consider = mediation.get("是否考虑先行调解")
    if consider in {"是", "否", "暂不确定，想要了解更多内容"}:
        tex = update_section_body_by_label(
            tex,
            "是否考虑先行调解",
            lambda old_body: set_explicit_option(old_body, consider, ["是", "否", "暂不确定，想要了解更多内容"]),
        )

    return tex


def load_schema_field_types(template_dir: str) -> dict:
    """
    读取当前模板目录下的 schema.json，返回 “字段标签 -> 字段类型” 映射。
    仅用于帮助后端区分 radio / checkbox / text。
    """
    schema_path = os.path.join(template_dir, "schema.json")
    if not os.path.exists(schema_path):
        return {}

    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            schema = json.load(f)
    except Exception:
        return {}

    field_types = {}

    def walk(fields):
        for field in fields or []:
            label = field.get("label") or field.get("title") or field.get("id")
            field_type = field.get("type")
            if label and field_type:
                field_types[normalize_label(str(label))] = field_type
            if field.get("fields"):
                walk(field.get("fields"))

    for section in schema.get("sections", []):
        walk(section.get("fields", []))

    return field_types


def inline_fillable_inputs(template_file: str, tex: str) -> str:
    """
    将需要参与字段填充的公共片段内联到主模板中。

    目前主要处理 common/mediation 这类通过 \\input 引入、但内部仍包含
    可填写 \\pairsection 的公共片段。前导码等不需要填充的公共文件保留原样。
    """
    template_dir = os.path.dirname(os.path.abspath(template_file))
    pattern = re.compile(r"\\input\{([^}]+)\}")

    def replace(match):
        raw_path = match.group(1).strip()
        if os.path.basename(raw_path) not in FILLABLE_INPUT_BASENAMES:
            return match.group(0)

        resolved = os.path.normpath(os.path.join(template_dir, raw_path))
        if not resolved.endswith(".tex"):
            resolved += ".tex"
        if not os.path.exists(resolved):
            return match.group(0)

        with open(resolved, "r", encoding="utf-8") as f:
            return f.read()

    return pattern.sub(replace, tex)


def prepare_compile_workspace(tmpdir: str, template_dir: str) -> str:
    """
    创建编译工作区。

    重构版模板依赖 ../../templates/common/* 相对路径，因此这里保留
    tmpdir/template_refactor/<模板目录> 的目录层级，并把 common 目录复制到
    tmpdir/templates/common 下，让原有相对路径在临时目录中仍然成立。
    """
    workspace_dir = os.path.join(tmpdir, "template_refactor", os.path.basename(template_dir))
    os.makedirs(workspace_dir, exist_ok=True)

    if os.path.isdir(COMMON_TEMPLATE_DIR):
        common_dst = os.path.join(tmpdir, "templates", "common")
        shutil.copytree(COMMON_TEMPLATE_DIR, common_dst, dirs_exist_ok=True)

    # 原始模板通常使用 Path=./ 引本地字体，保留这些资源即可兼容旧模板。
    for name in os.listdir(template_dir):
        src = os.path.join(template_dir, name)
        if not os.path.isfile(src):
            continue
        if name.lower().endswith((".ttf", ".otf", ".sty", ".cls")):
            shutil.copy2(src, os.path.join(workspace_dir, name))

    return workspace_dir


def fill_field(tex: str, label: str, value: str, occurrence: int = 1) -> str:
    """
    在 tex 中找到 "label：" 后面的空白/横线，填入 value。
    支持 "姓名：" → "姓名：张三" 这种简单替换。
    occurrence: 替换第几次出现(1-based)。
    """
    if not value:
        return tex
    val = escape_latex(value)
    # 精确匹配 "label：" 后面紧跟 \\ 或换行（表示空字段）
    pattern = label + "："
    count = 0
    idx = 0
    while True:
        pos = tex.find(pattern, idx)
        if pos == -1:
            break
        count += 1
        if count == occurrence:
            end = pos + len(pattern)
            tex = tex[:end] + val + tex[end:]
            break
        idx = pos + len(pattern)
    return tex


def fill_checkbox(tex: str, label_before: str, chosen_value: str, options: list, occurrence: int = 1) -> str:
    """
    替换一组 checkbox。
    找到 label_before 附近的 options 列表中各项的 $\\square$，
    将 chosen_value 对应的替换为 CHECKED，其余替换为 UNCHECKED。
    """
    # 简单实现：在整个tex中，按序替换每个 option+$\\square$ 组合
    for opt in options:
        old = opt + "$\\square$"
        if chosen_value == opt:
            new = opt + CHECKED
        else:
            new = opt + UNCHECKED
        # 只替换 occurrence 次
        count = 0
        idx = 0
        result = tex
        while True:
            pos = result.find(old, idx)
            if pos == -1:
                break
            count += 1
            if count == occurrence:
                result = result[:pos] + new + result[pos + len(old):]
                break
            idx = pos + len(old)
        tex = result
    return tex


def fill_sections(tex: str, data: dict, field_types: dict | None = None) -> str:
    """
    通用的 section 填充。
    
    data 结构约定（新版 — 数组格式，兼容旧版单 dict）：
    {
        "templateId": "009",
        "templateName": "...",
        "当事人信息": {
            "原告": [
                { "_类型": "自然人", "姓名": "张三", "性别": "男", ... },
                { "_类型": "组织", "名称": "某某公司", ... }
            ],
            "被告": [
                { "_类型": "自然人", "姓名": "李四", ... }
            ],
            "第三人": [],
            "委托诉讼代理人": { "有无": "有", "姓名": "...", ... }
        },
        ...
    }
    """
    
    # ===== 0. 展开当事人区块（支持多实体） =====
    tex = expand_party_blocks(tex, data)
    
    # 委托诉讼代理人
    parties = data.get("当事人信息", {})
    agent = parties.get("委托诉讼代理人", {})
    if agent:
        has = agent.get("有无", "")
        if has:
            tex = fill_agent(tex, agent)

    # ===== 1. 结构化区块字段 =====
    tex = fill_structured_sections(tex, data, field_types)
    tex = fill_mediation_sections(tex, data)
    
    # ===== 2. 诉讼请求自由文本 =====
    sq = data.get("诉讼请求", {})
    free_text = sq.get("_自由文本", "")
    if free_text:
        tex = tex.replace(
            "相关内容请在下方要素式表格中填写）\\\\[51bp]\n\\mbox{}",
            f"相关内容请在下方要素式表格中填写）\n\n{escape_latex(free_text)}\\\\[17bp]\n\\mbox{{}}",
            1
        )
    
    # 诉讼请求各项的具体字段
    sq_items = sq.get("各项", {})
    for key, item_data in sq_items.items():
        if isinstance(item_data, dict):
            for field, value in item_data.items():
                if field.startswith("_"):
                    continue
                tex = fill_field(tex, field, str(value))
    
    # ===== 3. 事实与理由自由文本 =====
    facts = data.get("事实与理由", {})
    free_fact = facts.get("_自由文本", "")
    if free_fact:
        # 第二个 "相关内容请在下方要素式表格中填写" 出现
        old_fact_box = "相关内容请在下方要素式表格中填写）\\\\[51bp]\n\\mbox{}"
        pos = tex.find(old_fact_box)
        if pos != -1:
            pos2 = tex.find(old_fact_box, pos + 1)
            if pos2 != -1:
                tex = tex[:pos2] + f"相关内容请在下方要素式表格中填写）\n\n{escape_latex(free_fact)}\\\\[17bp]\n\\mbox{{}}" + tex[pos2 + len(old_fact_box):]
    
    # 事实各项
    fact_items = facts.get("各项", {})
    for key, item_data in fact_items.items():
        if isinstance(item_data, dict):
            for field, value in item_data.items():
                if field.startswith("_"):
                    continue
                tex = fill_field(tex, field, str(value))
    
    # ===== 5. 调解意愿 =====
    mediate = data.get("调解意愿", {})
    understand = mediate.get("是否了解", "")
    if understand:
        tex = fill_checkbox(tex, "了解", understand, ["了解", "不了解"])
    consider = mediate.get("是否考虑先行调解", "")
    if consider:
        tex = fill_checkbox(tex, "是否考虑", consider, ["是", "否", "暂不确定，想要了解更多内容"])
    
    # ===== 6. 通用字段填充 —— 遍历 data 中所有平铺字段 =====
    flat_fields = data.get("字段", {})
    for field_label, value in flat_fields.items():
        if isinstance(value, str) and value:
            tex = fill_field(tex, field_label, value)
    
    # ===== 7. 勾选框 =====
    checkboxes = data.get("勾选", {})
    for group_label, chosen in checkboxes.items():
        if isinstance(chosen, str) and chosen:
            # 性别特殊处理
            if group_label == "性别":
                tex = fill_checkbox(tex, "性别：", chosen, ["男", "女"])
    
    return tex


def fill_role_natural(tex: str, role: str, person: dict) -> str:
    """填充一个角色的自然人信息（原告/被告/第三人）。
    在对应的 \\pairsection 中逐字段替换。"""
    if not person:
        return tex
    
    # 找到该角色的 pairsection 起始位置
    # 民事起诉状一般有: \\pairsection{原告}{...} 或 \\pairsection{原告\\（自然人）}{...}
    markers = [
        f"\\pairsection{{{role}}}",
        f"\\pairsection{{{role}\\\\（自然人）}}",
    ]
    
    for marker in markers:
        pos = tex.find(marker)
        if pos == -1:
            continue
        
        # 找到这个 section 的范围（到下一个 \\pairsection 或 \\subtitlesection）
        end_markers = ["\\pairsection{", "\\subtitlesection{", "\\newpage", "\\end{tcolorbox}"]
        section_end = len(tex)
        for em in end_markers:
            ep = tex.find(em, pos + len(marker) + 10)
            if ep != -1 and ep < section_end:
                section_end = ep
        
        section = tex[pos:section_end]
        original_section = section
        
        # 填充各字段
        g = person.get("性别", "")
        if g:
            section = section.replace("男$\\square$", f"男{cb(g=='男')}")
            section = section.replace("女$\\square$", f"女{cb(g=='女')}")
        
        for label in ["姓名", "民族", "工作单位", "职务", "联系电话",
                       "住所地（户籍所在地）", "经常居住地", "证件类型", "证件号码",
                       "住所地（主要办事机构所在地）", "注册地 / 登记地",
                       "法定代表人 / 负责人", "统一社会信用代码"]:
            val = person.get(label, "")
            if val:
                old_pattern = label + "："
                idx = section.find(old_pattern)
                if idx != -1:
                    end_idx = idx + len(old_pattern)
                    section = section[:end_idx] + escape_latex(val) + section[end_idx:]
        
        # 出生日期
        by = person.get("出生年", "")
        bm = person.get("出生月", "")
        bd = person.get("出生日", "")
        if by or bm or bd:
            section = section.replace(
                "出生日期：\\hspace{2em}年\\hspace{2em}月\\hspace{2em}日",
                f"出生日期：{by}年{bm}月{bd}日"
            )
        
        tex = tex.replace(original_section, section, 1)
        break  # 只处理第一个匹配的
    
    return tex


def fill_role_org(tex: str, role: str, org: dict) -> str:
    """填充一个角色的法人/非法人组织信息（原告/被告/第三人）。
    在对应的 \pairsection 中逐字段替换。"""
    if not org:
        return tex
    
    # 找到该角色的组织 pairsection 起始位置
    markers = [
        f"\\pairsection{{{role}\\\\（法人、非法人组织）}}",
    ]
    
    for marker in markers:
        pos = tex.find(marker)
        if pos == -1:
            continue
        
        # 找到这个 section 的范围
        end_markers = ["\\pairsection{", "\\subtitlesection{", "\\newpage", "\\end{tcolorbox}"]
        section_end = len(tex)
        for em in end_markers:
            ep = tex.find(em, pos + len(marker) + 10)
            if ep != -1 and ep < section_end:
                section_end = ep
        
        section = tex[pos:section_end]
        original_section = section
        
        # 填充各字段
        for label in ["名称", "住所地（主要办事机构所在地）", "注册地 / 登记地",
                       "法定代表人 / 负责人", "职务", "联系电话",
                       "统一社会信用代码"]:
            val = org.get(label, "")
            if val:
                old_pattern = label + "："
                idx = section.find(old_pattern)
                if idx != -1:
                    end_idx = idx + len(old_pattern)
                    section = section[:end_idx] + escape_latex(val) + section[end_idx:]
        
        # 类型 checkbox
        org_type = org.get("类型", "")
        if org_type:
            type_options = [
                "有限责任公司", "股份有限公司", "上市公司",
                "其他企业法人", "事业单位", "社会团体", "基金会",
                "社会服务机构", "机关法人", "农村集体经济组织法人",
                "城镇农村的合作经济组织法人", "基层群众性自治组织法人",
                "个人独资企业", "合伙企业", "不具有法人资格的专业服务机构",
            ]
            for opt in type_options:
                old = opt + "$\\square$"
                if opt == org_type:
                    new = opt + CHECKED
                else:
                    new = opt + UNCHECKED
                section = section.replace(old, new, 1)
        
        # 所有制性质 checkbox
        ownership = org.get("所有制性质", "")
        if ownership:
            for opt in ["国有", "民营"]:
                old = opt + "$\\square$"
                if opt == ownership:
                    new = opt + CHECKED
                else:
                    new = opt + UNCHECKED
                section = section.replace(old, new, 1)
            
            if ownership == "国有":
                sub = org.get("国有类型", "")
                if sub:
                    for opt in ["控股", "参股"]:
                        old = opt + "$\\square$"
                        if opt == sub:
                            new = opt + CHECKED
                        else:
                            new = opt + UNCHECKED
                        section = section.replace(old, new, 1)
        
        # 其他所有制
        other_own = org.get("其他所有制", "")
        if other_own:
            section = section.replace(
                "其他\\rule{60bp}{0.5pt}",
                f"其他{escape_latex(other_own)}"
            )
        
        tex = tex.replace(original_section, section, 1)
        break
    
    return tex


def fill_agent(tex: str, agent: dict) -> str:
    """填充委托诉讼代理人。"""
    has = agent.get("有无", "") == "有"
    
    # 找 "委托诉讼代理人" pairsection
    marker = "\\pairsection{委托诉讼代理人}{"
    pos = tex.find(marker)
    if pos == -1:
        return tex
    
    # 找这个 section 的结束
    end_markers = ["\\pairsection{", "\\subtitlesection{", "\\newpage"]
    section_end = len(tex)
    for em in end_markers:
        ep = tex.find(em, pos + len(marker) + 10)
        if ep != -1 and ep < section_end:
            section_end = ep
    
    section = tex[pos:section_end]
    original = section
    
    # 替换 有/无 checkbox
    section = section.replace("有$\\square$", f"有{cb(has)}", 1)
    section = section.replace("无$\\square$", f"无{cb(not has)}", 1)
    
    if has:
        for label in ["姓名", "单位", "职务", "联系电话"]:
            val = agent.get(label, "")
            if val:
                old = label + "："
                idx = section.find(old)
                if idx != -1:
                    end_idx = idx + len(old)
                    # 检查后面是否有 } 或 \\ 紧跟，不要在末尾添加
                    section = section[:end_idx] + escape_latex(val) + section[end_idx:]
        
        # 代理权限
        auth = agent.get("代理权限", "")
        if auth:
            section = section.replace("一般授权$\\square$", f"一般授权{cb(auth=='一般授权')}")
            section = section.replace("特别授权$\\square$", f"特别授权{cb(auth=='特别授权')}")
    
    tex = tex.replace(original, section, 1)
    return tex


# ============================================================
# 主流程
# ============================================================
def generate(template_dir: str, data_path: str, output_path: str):
    """主生成函数。"""
    # 找到模板 .tex 文件
    tex_files = [f for f in os.listdir(template_dir) if f.endswith('.tex')]
    if not tex_files:
        print(f"❌ 模板目录中没有 .tex 文件: {template_dir}", file=sys.stderr)
        sys.exit(1)
    
    template_file = os.path.join(template_dir, tex_files[0])
    
    with open(template_file, "r", encoding="utf-8") as f:
        tex = f.read()
    tex = inline_fillable_inputs(template_file, tex)
    
    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    field_types = load_schema_field_types(template_dir)

    # 填充模板
    tex = fill_sections(tex, data, field_types)
    
    # 在临时目录编译
    tmpdir = tempfile.mkdtemp(prefix="lawdoc_")
    try:
        workspace_dir = prepare_compile_workspace(tmpdir, template_dir)

        filled_tex = os.path.join(workspace_dir, "filled.tex")
        with open(filled_tex, "w", encoding="utf-8") as f:
            f.write(tex)
        
        # 编译两次确保页码正确
        for i in range(2):
            result = subprocess.run(
                ["xelatex", "-interaction=nonstopmode", "filled.tex"],
                cwd=workspace_dir, capture_output=True, text=True, timeout=60,
            )
            if result.returncode != 0 and i == 1:
                print("⚠ XeLaTeX 编译警告", file=sys.stderr)
                print(result.stdout[-800:], file=sys.stderr)
        
        pdf_src = os.path.join(workspace_dir, "filled.pdf")
        if os.path.exists(pdf_src):
            os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
            shutil.copy2(pdf_src, output_path)
            print(f"✅ 文书已生成: {os.path.abspath(output_path)}")
        else:
            print("❌ PDF 生成失败", file=sys.stderr)
            log = os.path.join(workspace_dir, "filled.log")
            if os.path.exists(log):
                with open(log) as f:
                    lines = f.readlines()
                for l in lines[-30:]:
                    print(l.rstrip(), file=sys.stderr)
            sys.exit(1)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


def main():
    parser = argparse.ArgumentParser(description="通用民事起诉状生成器")
    parser.add_argument("--template", required=True, help="模板目录路径")
    parser.add_argument("--data", required=True, help="数据 JSON 文件路径")
    parser.add_argument("--output", required=True, help="输出 PDF 文件路径")
    args = parser.parse_args()
    
    if not os.path.isdir(args.template):
        print(f"❌ 模板目录不存在: {args.template}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(args.data):
        print(f"❌ 数据文件不存在: {args.data}", file=sys.stderr)
        sys.exit(1)
    
    generate(args.template, args.data, args.output)


if __name__ == "__main__":
    main()
