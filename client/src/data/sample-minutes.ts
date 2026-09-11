/**
 * Sample Agent output for the public demo. Written from scratch with generic
 * safety-committee wording: no real people, places, incidents or figures.
 * Exercises every path of the builder: empty section, multi-line bullets,
 * a safety_table, an uncertain item, and an unexpected section that is ignored.
 */
export const SAMPLE_MINUTES_JSON: string = JSON.stringify(
  {
    meta: { meeting_no: "X" },
    sections: [
      { no: "一", title: "通過上次議程項目", items: [] },
      {
        no: "二",
        title: "跟進事項",
        items: [
          {
            content:
              "上次會議提出的走火通道標示已完成更新；\n倉庫地面防滑處理待承辦商報價，預計下次會議前完成。",
            action: "跟進",
          },
        ],
      },
      {
        no: "三",
        title: "安全表現",
        items: [
          {
            subtitle: "年度安全表現回顧",
            content: "根據統計，部門截至本季度的安全表現如下：",
            action: "記錄",
            safety_table: {
              rows: [
                { dept: "部門 A", accidents: "0", rate: "0", target: "0", meet: "符合" },
                { dept: "部門 B", accidents: "1", rate: "0.8", target: "2.0", meet: "符合" },
              ],
            },
          },
        ],
      },
      {
        no: "四",
        title: "警惕性工業意外個案分享",
        items: [
          {
            subtitle: "個案：高處工作",
            content:
              "事發經過：工友在未使用安全帶的情況下於平台邊緣工作，失足墮下受傷。\n提醒事項：\n所有高處工作必須佩戴安全帶並扣上固定點；\n工作前檢查平台護欄及工作台是否完好；\n如發現安全設施損壞，應立即停工並通知主管。",
            action: "記錄",
            uncertain: true,
            uncertain_note: "個案發生月份待核實",
          },
        ],
      },
      {
        no: "五",
        title: "工具箱專題",
        items: [
          {
            subtitle: "手動搬運安全",
            content:
              "搬運前先評估重量，超過負荷應兩人合力或使用搬運工具；\n保持背部挺直，以腿部發力，避免扭腰；\n搬運路線須保持暢通，注意地面濕滑。",
            action: "記錄",
          },
        ],
      },
      {
        no: "六",
        title: "其他事項",
        items: [
          {
            subtitle: "急救箱檢查",
            content: "建議每季檢查一次急救箱物資，並於清單上簽署日期。",
            action: "記錄",
          },
        ],
      },
      {
        no: "七",
        title: "下次會議日期及時間",
        items: [{ content: "下次會議日期另行通知。", action: "記錄" }],
      },
      {
        no: "八",
        title: "臨時動議",
        items: [{ content: "此章節不在固定七節內，預覽會提示並在生成時忽略。" }],
      },
    ],
  },
  null,
  2,
);
