# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - button "Open Next.js Dev Tools" [ref=e7] [cursor=pointer]:
    - img [ref=e8] [cursor=pointer]
  - alert [ref=e11]
  - generic [ref=e13]:
    - generic [ref=e14]:
      - heading "アカウント作成" [level=3] [ref=e15]
      - paragraph [ref=e16]: 証券CRMシステムに新規登録
    - generic [ref=e17]:
      - generic [ref=e18]:
        - generic [ref=e19]:
          - generic [ref=e20]: 名前
          - textbox "名前" [ref=e21]
        - generic [ref=e22]:
          - generic [ref=e23]: メールアドレス
          - textbox "メールアドレス" [ref=e24]
        - generic [ref=e25]:
          - generic [ref=e26]: パスワード
          - textbox "パスワード" [ref=e27]
        - generic [ref=e28]:
          - generic [ref=e29]: パスワード（確認）
          - textbox "パスワード（確認）" [ref=e30]
        - button "アカウント作成" [ref=e31]
      - paragraph [ref=e33]:
        - text: 既にアカウントをお持ちですか？
        - link "ログイン" [ref=e34] [cursor=pointer]:
          - /url: /login
      - paragraph [ref=e36]: ※ 登録すると営業担当(SALES)として登録されます
```