# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "アカウント作成" [level=3] [ref=e5]
      - paragraph [ref=e6]: 証券CRMシステムに新規登録
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: 名前
          - textbox "名前" [ref=e11]: Test User
        - generic [ref=e12]:
          - generic [ref=e13]: メールアドレス
          - textbox "メールアドレス" [active] [ref=e14]: test@example.com
        - generic [ref=e15]:
          - generic [ref=e16]: パスワード
          - textbox "パスワード" [ref=e17]
        - generic [ref=e18]:
          - generic [ref=e19]: パスワード（確認）
          - textbox "パスワード（確認）" [ref=e20]
        - button "アカウント作成" [ref=e21]
      - paragraph [ref=e23]:
        - text: 既にアカウントをお持ちですか？
        - link "ログイン" [ref=e24] [cursor=pointer]:
          - /url: /login
      - paragraph [ref=e26]: ※ 登録すると営業担当(SALES)として登録されます
  - button "Open Next.js Dev Tools" [ref=e32] [cursor=pointer]:
    - img [ref=e33] [cursor=pointer]
  - alert [ref=e36]
```