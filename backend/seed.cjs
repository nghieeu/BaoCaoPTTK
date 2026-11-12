// Demo catalog and historical invoices. Loaded only on first database initialization.
module.exports = {
  "foods": [
    {
      "id": "f1",
      "name": "Bò nướng sốt tiêu đen",
      "category": "Món chính",
      "price": 189000,
      "icon": "🥩",
      "desc": "Thăn bò mềm nướng vừa chín, dùng cùng sốt tiêu đen và rau củ theo mùa.",
      "ingredients": "Thăn bò, tiêu đen, bơ, khoai tây",
      "available": true
    },
    {
      "id": "f2",
      "name": "Salad cá hồi áp chảo",
      "category": "Khai vị",
      "price": 129000,
      "icon": "🥗",
      "desc": "Cá hồi áp chảo cùng xà lách tươi, cà chua bi và sốt mè rang.",
      "ingredients": "Cá hồi, xà lách, cà chua, mè",
      "available": true
    },
    {
      "id": "f3",
      "name": "Mì Ý sốt kem nấm",
      "category": "Món chính",
      "price": 145000,
      "icon": "🍝",
      "desc": "Mì Ý al dente với sốt kem béo nhẹ, nấm tươi và phô mai Parmesan.",
      "ingredients": "Mì Ý, kem sữa, nấm, phô mai",
      "available": true
    },
    {
      "id": "f4",
      "name": "Súp bí đỏ kem tươi",
      "category": "Khai vị",
      "price": 69000,
      "icon": "🥣",
      "desc": "Súp bí đỏ mịn, thơm kem sữa, ăn kèm bánh mì nướng.",
      "ingredients": "Bí đỏ, kem sữa, bánh mì",
      "available": true
    },
    {
      "id": "f5",
      "name": "Cơm gà nướng mật ong",
      "category": "Món chính",
      "price": 119000,
      "icon": "🍗",
      "desc": "Đùi gà ướp mật ong nướng vàng cùng cơm và rau củ.",
      "ingredients": "Gà, gạo, mật ong, rau củ",
      "available": true
    },
    {
      "id": "f6",
      "name": "Trà đào cam sả",
      "category": "Đồ uống",
      "price": 49000,
      "icon": "🍹",
      "desc": "Trà thanh mát, đào ngâm, cam tươi và hương sả.",
      "ingredients": "Trà, đào, cam, sả",
      "available": true
    }
  ],
  "customers": [
    {
      "id": "c1",
      "name": "Nguyễn Minh Anh",
      "phone": "0901234567",
      "tier": "Vàng"
    },
    {
      "id": "c2",
      "name": "Trần Hoàng Nam",
      "phone": "0912345678",
      "tier": "Bạc"
    },
    {
      "id": "c3",
      "name": "Lê Thu Hà",
      "phone": "0923456789",
      "tier": "Vàng"
    },
    {
      "id": "c4",
      "name": "Phạm Đức Huy",
      "phone": "0934567890",
      "tier": "Thành viên"
    },
    {
      "id": "c5",
      "name": "Vũ Ngọc Linh",
      "phone": "0945678901",
      "tier": "Bạc"
    },
    {
      "id": "c6",
      "name": "Đặng Quang Minh",
      "phone": "0956789012",
      "tier": "Thành viên"
    }
  ],
  "suppliers": [
    {
      "id": "s1",
      "name": "Thực phẩm An Phú",
      "phone": "02838221234",
      "address": "28 Nguyễn Văn Trỗi, TP. Hồ Chí Minh"
    },
    {
      "id": "s2",
      "name": "Nông trại Đà Lạt Xanh",
      "phone": "02633821234",
      "address": "Phường 7, Đà Lạt"
    }
  ],
  "ingredients": [
    {
      "id": "i1",
      "name": "Thăn bò",
      "unit": "kg",
      "stock": 24,
      "min": 10
    },
    {
      "id": "i2",
      "name": "Cá hồi",
      "unit": "kg",
      "stock": 8,
      "min": 10
    },
    {
      "id": "i3",
      "name": "Rau xà lách",
      "unit": "kg",
      "stock": 15,
      "min": 5
    },
    {
      "id": "i4",
      "name": "Gạo",
      "unit": "kg",
      "stock": 65,
      "min": 20
    },
    {
      "id": "i5",
      "name": "Kem sữa",
      "unit": "lít",
      "stock": 4,
      "min": 8
    }
  ],
  "combos": [
    {
      "id": "co1",
      "name": "Bữa trưa trọn vị",
      "foods": [
        "f4",
        "f5",
        "f6"
      ],
      "price": 199000
    }
  ],
  "tables": [
    {
      "id": 1,
      "seats": 4,
      "customer": "",
      "items": []
    },
    {
      "id": 2,
      "seats": 4,
      "customer": "",
      "items": []
    },
    {
      "id": 3,
      "seats": 4,
      "customer": "",
      "items": []
    },
    {
      "id": 4,
      "seats": 4,
      "customer": "",
      "items": []
    },
    {
      "id": 5,
      "seats": 4,
      "customer": "",
      "items": []
    },
    {
      "id": 6,
      "seats": 4,
      "customer": "",
      "items": []
    },
    {
      "id": 7,
      "seats": 4,
      "customer": "",
      "items": []
    },
    {
      "id": 8,
      "seats": 4,
      "customer": "",
      "items": []
    },
    {
      "id": 9,
      "seats": 6,
      "customer": "",
      "items": []
    },
    {
      "id": 10,
      "seats": 6,
      "customer": "",
      "items": []
    },
    {
      "id": 11,
      "seats": 6,
      "customer": "",
      "items": []
    },
    {
      "id": 12,
      "seats": 6,
      "customer": "",
      "items": []
    }
  ],
  "bookings": [],
  "imports": [],
  "invoices": [
    {
      "id": "HD1001",
      "customer": "c1",
      "date": "2026-11-01",
      "table": 1,
      "items": [
        {
          "id": "f1",
          "qty": 1,
          "price": 189000,
          "name": "Bò nướng sốt tiêu đen"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 287000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1002",
      "customer": "c2",
      "date": "2026-11-02",
      "table": 2,
      "items": [
        {
          "id": "f2",
          "qty": 2,
          "price": 129000,
          "name": "Salad cá hồi áp chảo"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 356000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1003",
      "customer": "c3",
      "date": "2026-11-03",
      "table": 3,
      "items": [
        {
          "id": "f3",
          "qty": 3,
          "price": 145000,
          "name": "Mì Ý sốt kem nấm"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 533000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1004",
      "customer": "c4",
      "date": "2026-11-04",
      "table": 4,
      "items": [
        {
          "id": "f4",
          "qty": 1,
          "price": 69000,
          "name": "Súp bí đỏ kem tươi"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 167000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1005",
      "customer": "c5",
      "date": "2026-11-05",
      "table": 5,
      "items": [
        {
          "id": "f5",
          "qty": 2,
          "price": 119000,
          "name": "Cơm gà nướng mật ong"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 336000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1006",
      "customer": "c6",
      "date": "2026-11-06",
      "table": 6,
      "items": [
        {
          "id": "f6",
          "qty": 3,
          "price": 49000,
          "name": "Trà đào cam sả"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 245000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1007",
      "customer": "c1",
      "date": "2026-11-07",
      "table": 7,
      "items": [
        {
          "id": "f1",
          "qty": 1,
          "price": 189000,
          "name": "Bò nướng sốt tiêu đen"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 287000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1008",
      "customer": "c2",
      "date": "2026-11-08",
      "table": 8,
      "items": [
        {
          "id": "f2",
          "qty": 2,
          "price": 129000,
          "name": "Salad cá hồi áp chảo"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 356000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1009",
      "customer": "c3",
      "date": "2026-11-09",
      "table": 9,
      "items": [
        {
          "id": "f3",
          "qty": 3,
          "price": 145000,
          "name": "Mì Ý sốt kem nấm"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 533000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1010",
      "customer": "c4",
      "date": "2026-11-10",
      "table": 10,
      "items": [
        {
          "id": "f4",
          "qty": 1,
          "price": 69000,
          "name": "Súp bí đỏ kem tươi"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 167000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1011",
      "customer": "c5",
      "date": "2026-11-11",
      "table": 11,
      "items": [
        {
          "id": "f5",
          "qty": 2,
          "price": 119000,
          "name": "Cơm gà nướng mật ong"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 336000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1012",
      "customer": "c6",
      "date": "2026-11-01",
      "table": 12,
      "items": [
        {
          "id": "f6",
          "qty": 3,
          "price": 49000,
          "name": "Trà đào cam sả"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 245000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1013",
      "customer": "c1",
      "date": "2026-11-02",
      "table": 1,
      "items": [
        {
          "id": "f1",
          "qty": 1,
          "price": 189000,
          "name": "Bò nướng sốt tiêu đen"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 287000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1014",
      "customer": "c2",
      "date": "2026-11-03",
      "table": 2,
      "items": [
        {
          "id": "f2",
          "qty": 2,
          "price": 129000,
          "name": "Salad cá hồi áp chảo"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 356000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1015",
      "customer": "c3",
      "date": "2026-11-04",
      "table": 3,
      "items": [
        {
          "id": "f3",
          "qty": 3,
          "price": 145000,
          "name": "Mì Ý sốt kem nấm"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 533000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1016",
      "customer": "c4",
      "date": "2026-11-05",
      "table": 4,
      "items": [
        {
          "id": "f4",
          "qty": 1,
          "price": 69000,
          "name": "Súp bí đỏ kem tươi"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 167000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1017",
      "customer": "c5",
      "date": "2026-11-06",
      "table": 5,
      "items": [
        {
          "id": "f5",
          "qty": 2,
          "price": 119000,
          "name": "Cơm gà nướng mật ong"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 336000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1018",
      "customer": "c6",
      "date": "2026-11-07",
      "table": 6,
      "items": [
        {
          "id": "f6",
          "qty": 3,
          "price": 49000,
          "name": "Trà đào cam sả"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 245000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1019",
      "customer": "c1",
      "date": "2026-11-08",
      "table": 7,
      "items": [
        {
          "id": "f1",
          "qty": 1,
          "price": 189000,
          "name": "Bò nướng sốt tiêu đen"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 287000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1020",
      "customer": "c2",
      "date": "2026-11-09",
      "table": 8,
      "items": [
        {
          "id": "f2",
          "qty": 2,
          "price": 129000,
          "name": "Salad cá hồi áp chảo"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 356000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1021",
      "customer": "c3",
      "date": "2026-11-10",
      "table": 9,
      "items": [
        {
          "id": "f3",
          "qty": 3,
          "price": 145000,
          "name": "Mì Ý sốt kem nấm"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 533000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1022",
      "customer": "c4",
      "date": "2026-11-11",
      "table": 10,
      "items": [
        {
          "id": "f4",
          "qty": 1,
          "price": 69000,
          "name": "Súp bí đỏ kem tươi"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 167000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1023",
      "customer": "c5",
      "date": "2026-11-01",
      "table": 11,
      "items": [
        {
          "id": "f5",
          "qty": 2,
          "price": 119000,
          "name": "Cơm gà nướng mật ong"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 336000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1024",
      "customer": "c6",
      "date": "2026-11-02",
      "table": 12,
      "items": [
        {
          "id": "f6",
          "qty": 3,
          "price": 49000,
          "name": "Trà đào cam sả"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 245000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1025",
      "customer": "c1",
      "date": "2026-11-03",
      "table": 1,
      "items": [
        {
          "id": "f1",
          "qty": 1,
          "price": 189000,
          "name": "Bò nướng sốt tiêu đen"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 287000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1026",
      "customer": "c2",
      "date": "2026-11-04",
      "table": 2,
      "items": [
        {
          "id": "f2",
          "qty": 2,
          "price": 129000,
          "name": "Salad cá hồi áp chảo"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 356000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1027",
      "customer": "c3",
      "date": "2026-11-05",
      "table": 3,
      "items": [
        {
          "id": "f3",
          "qty": 3,
          "price": 145000,
          "name": "Mì Ý sốt kem nấm"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 533000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1028",
      "customer": "c4",
      "date": "2026-11-06",
      "table": 4,
      "items": [
        {
          "id": "f4",
          "qty": 1,
          "price": 69000,
          "name": "Súp bí đỏ kem tươi"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 167000,
      "method": "Chuyển khoản"
    },
    {
      "id": "HD1029",
      "customer": "c5",
      "date": "2026-11-07",
      "table": 5,
      "items": [
        {
          "id": "f5",
          "qty": 2,
          "price": 119000,
          "name": "Cơm gà nướng mật ong"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 336000,
      "method": "Tiền mặt"
    },
    {
      "id": "HD1030",
      "customer": "c6",
      "date": "2026-11-08",
      "table": 6,
      "items": [
        {
          "id": "f6",
          "qty": 3,
          "price": 49000,
          "name": "Trà đào cam sả"
        },
        {
          "id": "f6",
          "qty": 2,
          "price": 49000,
          "name": "Trà đào cam sả"
        }
      ],
      "total": 245000,
      "method": "Chuyển khoản"
    }
  ]
};
