#!/usr/bin/env python3
"""
Cloudflare Email Routing 配置脚本
用于为域名配置临时邮箱功能
"""

import requests
import time

# Cloudflare API 配置
API_TOKEN = "K7PXcYN8vYe4XWPDumMhJetUHGtSxtXbECDpcRje"
ACCOUNT_ID = "ef08b1a0972ae885148e0db0c068d0c0"
KV_NAMESPACE_ID = "1d7465fcc71f48f293a27ecada5f5289"
WORKER_NAME = "email-receiver-worker"

# 要配置的域名和子域名
DOMAIN = "zhufada.de"
SUBDOMAINS = ["r1", "s1", "qa", "a0", "b2", "c3", "d4", "e5", "f6", "g7"]

# Cloudflare Email Routing MX 服务器
MX_SERVERS = [
    {"content": "route1.mx.cloudflare.net", "priority": 54},
    {"content": "route2.mx.cloudflare.net", "priority": 22},
    {"content": "route3.mx.cloudflare.net", "priority": 1},
]

HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}


def get_zone_id(domain: str) -> str:
    """获取域名的 Zone ID"""
    url = f"https://api.cloudflare.com/client/v4/zones?name={domain}"
    resp = requests.get(url, headers=HEADERS)
    data = resp.json()
    if data["success"] and data["result"]:
        zone_id = data["result"][0]["id"]
        print(f"✅ 获取 Zone ID: {zone_id}")
        return zone_id
    else:
        raise Exception(f"❌ 无法获取 Zone ID: {data}")


def enable_email_routing(zone_id: str) -> bool:
    """启用 Email Routing"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/email/routing/enable"
    resp = requests.post(url, headers=HEADERS)
    data = resp.json()
    if data["success"]:
        print(f"✅ Email Routing 已启用，状态: {data['result']['status']}")
        return True
    else:
        print(f"⚠️ 启用 Email Routing: {data}")
        return False


def get_email_routing_status(zone_id: str) -> dict:
    """获取 Email Routing 状态"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/email/routing"
    resp = requests.get(url, headers=HEADERS)
    return resp.json()


def add_mx_record(zone_id: str, name: str, content: str, priority: int) -> bool:
    """添加 MX 记录"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"
    data = {
        "type": "MX",
        "name": name,
        "content": content,
        "priority": priority,
        "ttl": 1
    }
    resp = requests.post(url, headers=HEADERS, json=data)
    result = resp.json()
    if result["success"]:
        return True
    else:
        # 如果是因为 Email Routing 管理导致的错误，忽略
        if result.get("errors") and result["errors"][0].get("code") == 890190:
            print(f"  ⏭️ MX 记录由 Email Routing 管理: {name}")
            return True
        print(f"  ❌ 添加 MX 记录失败 {name}: {result}")
        return False


def add_txt_record(zone_id: str, name: str, content: str) -> bool:
    """添加 TXT 记录 (SPF)"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records"
    data = {
        "type": "TXT",
        "name": name,
        "content": content,
        "ttl": 1
    }
    resp = requests.post(url, headers=HEADERS, json=data)
    result = resp.json()
    if result["success"]:
        return True
    else:
        print(f"  ❌ 添加 TXT 记录失败 {name}: {result}")
        return False


def setup_subdomain(zone_id: str, subdomain: str, domain: str):
    """为子域名配置 MX 和 SPF 记录"""
    full_name = f"{subdomain}.{domain}"
    print(f"\n📧 配置子域名: {full_name}")
    
    # 添加 3 条 MX 记录
    for mx in MX_SERVERS:
        add_mx_record(zone_id, full_name, mx["content"], mx["priority"])
    
    # 添加 SPF 记录
    spf_content = "v=spf1 include:_spf.mx.cloudflare.net ~all"
    add_txt_record(zone_id, full_name, spf_content)
    
    print(f"  ✅ {full_name} 配置完成")


def setup_catch_all(zone_id: str) -> bool:
    """配置 catch-all 规则转发到 worker"""
    url = f"https://api.cloudflare.com/client/v4/zones/{zone_id}/email/routing/rules/catch_all"
    data = {
        "enabled": True,
        "actions": [{"type": "worker", "value": [WORKER_NAME]}]
    }
    resp = requests.put(url, headers=HEADERS, json=data)
    result = resp.json()
    if result["success"]:
        print(f"✅ Catch-all 规则已配置为转发到 {WORKER_NAME}")
        return True
    else:
        print(f"❌ 配置 catch-all 失败: {result}")
        return False


def get_current_email_domains() -> list:
    """获取当前的 EMAIL_DOMAINS 配置"""
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{KV_NAMESPACE_ID}/values/EMAIL_DOMAINS"
    resp = requests.get(url, headers=HEADERS)
    if resp.status_code == 200:
        return resp.text.split(",") if resp.text else []
    return []


def update_email_domains(new_domains: list) -> bool:
    """更新 KV 中的 EMAIL_DOMAINS"""
    current = get_current_email_domains()
    print(f"\n📋 当前 EMAIL_DOMAINS: {current}")
    
    # 合并新旧域名，去重
    all_domains = list(set(current + new_domains))
    domains_str = ",".join(all_domains)
    
    url = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/storage/kv/namespaces/{KV_NAMESPACE_ID}/values/EMAIL_DOMAINS"
    resp = requests.put(url, headers={"Authorization": f"Bearer {API_TOKEN}", "Content-Type": "text/plain"}, data=domains_str)
    result = resp.json()
    
    if result["success"]:
        print(f"✅ EMAIL_DOMAINS 已更新: {domains_str}")
        return True
    else:
        print(f"❌ 更新 EMAIL_DOMAINS 失败: {result}")
        return False


def main():
    print(f"🚀 开始配置 {DOMAIN} 的临时邮箱功能")
    print(f"📝 子域名列表: {SUBDOMAINS}")
    print("=" * 50)
    
    # 1. 获取 Zone ID
    zone_id = get_zone_id(DOMAIN)
    
    # 2. 启用 Email Routing
    enable_email_routing(zone_id)
    time.sleep(1)  # 等待一下让配置生效
    
    # 3. 为每个子域名配置 DNS 记录
    for subdomain in SUBDOMAINS:
        setup_subdomain(zone_id, subdomain, DOMAIN)
        time.sleep(0.5)  # 避免请求过快
    
    # 4. 配置 catch-all 规则
    print("\n" + "=" * 50)
    setup_catch_all(zone_id)
    
    # 5. 更新 KV 中的 EMAIL_DOMAINS
    print("\n" + "=" * 50)
    new_domains = [f"{sub}.{DOMAIN}" for sub in SUBDOMAINS]
    update_email_domains(new_domains)
    
    # 6. 最终状态检查
    print("\n" + "=" * 50)
    status = get_email_routing_status(zone_id)
    if status["success"]:
        print(f"✅ Email Routing 最终状态: {status['result']['status']}")
    
    print("\n🎉 配置完成！以下邮箱域名现在可用：")
    for sub in SUBDOMAINS:
        print(f"   *@{sub}.{DOMAIN}")


if __name__ == "__main__":
    main()
