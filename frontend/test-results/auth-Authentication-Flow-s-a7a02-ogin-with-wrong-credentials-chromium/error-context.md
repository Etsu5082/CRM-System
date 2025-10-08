# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "証券CRM" [level=3] [ref=e5]
      - paragraph [ref=e6]: メールアドレスとパスワードでログイン
    - generic [ref=e7]:
      - generic [ref=e8]:
        - generic [ref=e9]:
          - generic [ref=e10]: メールアドレス
          - textbox "メールアドレス" [ref=e11]
        - generic [ref=e12]:
          - generic [ref=e13]: パスワード
          - textbox "パスワード" [ref=e14]
        - button "ログイン" [ref=e15]
      - paragraph [ref=e17]:
        - text: アカウントをお持ちでない方は
        - link "新規登録" [ref=e18] [cursor=pointer]:
          - /url: /register
      - generic [ref=e19]:
        - paragraph [ref=e20]: テスト用アカウント
        - paragraph [ref=e21]:
          - text: "Email: admin@example.com"
          - text: "Password: Admin123!"
  - button "Open Next.js Dev Tools" [ref=e27] [cursor=pointer]:
    - img [ref=e28] [cursor=pointer]
  - alert [ref=e31]
```