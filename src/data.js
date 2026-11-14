// Tuyến đường, ga thật, chủ đề cảnh vật theo ga
// Tỉnh/thành theo 34 đơn vị hành chính sau sắp xếp 7/2025.
// town = cảnh quanh ga, region = cảnh đồng quê sau ga (theo chiều Bắc→Nam), feat = cầu/hầm trên chặng tới ga kế tiếp.
export const TRAIN = [
  { id: 'hanoi', name: 'Hà Nội', prov: 'Hà Nội', fame: 'Phở, Hồ Gươm', emo: '🍜', lat: 21.02, lon: 105.84, town: 'oldcity', region: 'paddy', lm: 'hoguom', feat: 'river' },
  { id: 'phuly', name: 'Phủ Lý', prov: 'Ninh Bình', fame: 'Chùa Tam Chúc', emo: '🛕', lat: 20.54, lon: 105.91, town: 'town', region: 'paddy', feat: null },
  { id: 'namdinh', name: 'Nam Định', prov: 'Ninh Bình', fame: 'Phở bò, tháp Phổ Minh', emo: '🏯', lat: 20.42, lon: 106.17, town: 'town', region: 'paddy', lm: 'phominh', feat: 'river' },
  { id: 'ninhbinh', name: 'Ninh Bình', prov: 'Ninh Bình', fame: 'Tràng An, núi đá vôi', emo: '⛰️', lat: 20.25, lon: 105.97, town: 'karst', region: 'karst', lm: 'trangan', feat: 'tunnel' },
  { id: 'thanhhoa', name: 'Thanh Hoá', prov: 'Thanh Hoá', fame: 'Nem chua', emo: '🥢', lat: 19.81, lon: 105.77, town: 'town', region: 'paddy', feat: 'river' },
  { id: 'vinh', name: 'Vinh', prov: 'Nghệ An', fame: 'Cam Vinh', emo: '🍊', lat: 18.68, lon: 105.67, town: 'town', region: 'hills', feat: 'tunnel' },
  { id: 'donghoi', name: 'Đồng Hới', prov: 'Quảng Trị', fame: 'Động Phong Nha', emo: '🦇', lat: 17.47, lon: 106.6, town: 'coasttown', region: 'coast', feat: 'river' },
  { id: 'dongha', name: 'Đông Hà', prov: 'Quảng Trị', fame: 'Cầu Hiền Lương', emo: '🌉', lat: 16.82, lon: 107.1, town: 'town', region: 'hills', feat: null },
  { id: 'hue', name: 'Huế', prov: 'Huế', fame: 'Đại Nội, nón lá, bún bò', emo: '👒', lat: 16.46, lon: 107.58, town: 'citadel', region: 'paddy', lm: 'hue', feat: 'tunnel' },
  { id: 'danang', name: 'Đà Nẵng', prov: 'Đà Nẵng', fame: 'Cầu Rồng, mì Quảng', emo: '🐉', lat: 16.07, lon: 108.21, town: 'coastcity', region: 'coast', lm: 'caurong', feat: 'river' },
  { id: 'tamky', name: 'Tam Kỳ', prov: 'Đà Nẵng', fame: 'Cơm gà Tam Kỳ', emo: '🍗', lat: 15.57, lon: 108.47, town: 'town', region: 'paddy', feat: null },
  { id: 'quangngai', name: 'Quảng Ngãi', prov: 'Quảng Ngãi', fame: 'Tỏi Lý Sơn', emo: '🧄', lat: 15.12, lon: 108.8, town: 'town', region: 'paddy', feat: 'river' },
  { id: 'dieutri', name: 'Diêu Trì', prov: 'Gia Lai', fame: 'Tháp Chăm, võ Bình Định', emo: '🥋', lat: 13.8, lon: 109.15, town: 'town', region: 'hills', lm: 'cham', feat: 'tunnel' },
  { id: 'tuyhoa', name: 'Tuy Hoà', prov: 'Đắk Lắk', fame: 'Gành Đá Đĩa', emo: '🪨', lat: 13.09, lon: 109.3, town: 'coasttown', region: 'coast', lm: 'ganh', feat: 'tunnel' },
  { id: 'nhatrang', name: 'Nha Trang', prov: 'Khánh Hoà', fame: 'Biển xanh, tháp Bà Ponagar', emo: '🏖️', lat: 12.25, lon: 109.18, town: 'coastcity', region: 'coast', lm: 'cham', feat: null },
  { id: 'thapcham', name: 'Tháp Chàm', prov: 'Khánh Hoà', fame: 'Nho, tháp Po Klong Garai', emo: '🍇', lat: 11.58, lon: 108.95, town: 'dry', region: 'dry', lm: 'cham', feat: null },
  { id: 'muongman', name: 'Mương Mán', prov: 'Lâm Đồng', fame: 'Thanh long, đồi cát', emo: '🌵', lat: 10.95, lon: 107.98, town: 'dragonfruit', region: 'dragonfruit', feat: null },
  { id: 'bienhoa', name: 'Biên Hoà', prov: 'Đồng Nai', fame: 'Bưởi, rừng cao su', emo: '🍈', lat: 10.95, lon: 106.82, town: 'town', region: 'rubber', feat: 'river' },
  { id: 'saigon', name: 'Sài Gòn', prov: 'TP. Hồ Chí Minh', fame: 'Bánh mì, chợ Bến Thành', emo: '🥖', lat: 10.78, lon: 106.68, town: 'hcm', region: 'hcm', lm: 'tower', feat: null }
];
// Metro số 1 Bến Thành – Suối Tiên (14 ga, 3 ga đầu đi ngầm)
export const METRO = [
  { id: 'm_benthanh', name: 'Bến Thành', prov: 'TP. Hồ Chí Minh', fame: 'Chợ Bến Thành', emo: '🕰️', under: true, town: 'hcm', mural: '🕰️' },
  { id: 'm_nhahat', name: 'Nhà hát Thành phố', prov: 'TP. Hồ Chí Minh', fame: 'Nhà hát Lớn', emo: '🎭', under: true, town: 'hcm', mural: '🎭' },
  { id: 'm_bason', name: 'Ba Son', prov: 'TP. Hồ Chí Minh', fame: 'Bờ sông Sài Gòn', emo: '⚓', under: true, town: 'hcm', mural: '⚓' },
  { id: 'm_vanthanh', name: 'Công viên Văn Thánh', prov: 'TP. Hồ Chí Minh', fame: 'Công viên xanh', emo: '🌳', town: 'park', feat: null },
  { id: 'm_tancang', name: 'Tân Cảng', prov: 'TP. Hồ Chí Minh', fame: 'Toà nhà cao nhất Việt Nam', emo: '🏙️', town: 'hcm', lm: 'tower', feat: 'river' },
  { id: 'm_thaodien', name: 'Thảo Điền', prov: 'TP. Hồ Chí Minh', fame: 'Nhà vườn xanh mát', emo: '🏡', town: 'villa' },
  { id: 'm_anphu', name: 'An Phú', prov: 'TP. Hồ Chí Minh', fame: 'Khu nhà mới', emo: '🏢', town: 'hcm2' },
  { id: 'm_rachchiec', name: 'Rạch Chiếc', prov: 'TP. Hồ Chí Minh', fame: 'Sông rạch, sân golf', emo: '⛳', town: 'park', feat: 'river' },
  { id: 'm_phuoclong', name: 'Phước Long', prov: 'TP. Hồ Chí Minh', fame: 'Cầu Phước Long', emo: '🌉', town: 'hcm2' },
  { id: 'm_binhthai', name: 'Bình Thái', prov: 'TP. Hồ Chí Minh', fame: 'Xa lộ Hà Nội', emo: '🛣️', town: 'hcm2' },
  { id: 'm_thuduc', name: 'Thủ Đức', prov: 'TP. Hồ Chí Minh', fame: 'Phố phường đông vui', emo: '🏘️', town: 'hcm2' },
  { id: 'm_cnc', name: 'Khu Công nghệ cao', prov: 'TP. Hồ Chí Minh', fame: 'Nhà máy công nghệ', emo: '🔬', town: 'tech' },
  { id: 'm_dhqg', name: 'Đại học Quốc gia', prov: 'TP. Hồ Chí Minh', fame: 'Làng đại học', emo: '🎓', town: 'campus' },
  { id: 'm_suoitien', name: 'Bến xe Suối Tiên', prov: 'TP. Hồ Chí Minh', fame: 'Công viên Suối Tiên', emo: '🎡', town: 'amuse', lm: 'wheel' }
];
METRO.forEach(s => s.region = s.town);

export const VEHICLES = {
  train: { name: 'Tàu hoả Bắc – Nam', short: 'Tàu hoả', emoji: '🚂', route: 'train', stop: 'Ga', ctx: 'tàu', track: 'rail', slotTitle: 'Số toa (số câu mỗi ga)', slotName: 'Toa', kid: 'hành khách', icon: '🚃' },
  metro: { name: 'Metro số 1', short: 'Metro', emoji: '🚇', route: 'metro', stop: 'Ga', ctx: 'tàu điện', track: 'metro', slotTitle: 'Số toa (số câu mỗi ga)', slotName: 'Toa', kid: 'hành khách', icon: '🚃' },
  car: { name: 'Ô tô đón bạn', short: 'Ô tô', emoji: '🚗', route: 'train', stop: 'Trạm', ctx: 'xe', track: 'road', slotTitle: 'Số bạn cần đón mỗi trạm', slotName: 'Bạn', kid: 'bạn nhỏ', icon: '🧒' },
  taxi: { name: 'Taxi chở khách', short: 'Taxi', emoji: '🚕', route: 'train', stop: 'Trạm', ctx: 'xe taxi', track: 'road', slotTitle: 'Số khách đón mỗi trạm', slotName: 'Khách', kid: 'hành khách', icon: '🧳' },
  truck: { name: 'Xe tải chở đặc sản', short: 'Xe tải', emoji: '🚚', route: 'train', stop: 'Trạm', ctx: 'xe tải', track: 'road', slotTitle: 'Số thùng hàng mỗi trạm', slotName: 'Thùng hàng', kid: 'thùng hàng', icon: '📦' },
  police: { name: 'Xe cảnh sát tuần tra', short: 'Cảnh sát', emoji: '🚓', route: 'train', stop: 'Trạm', ctx: 'xe cảnh sát', track: 'road', slotTitle: 'Số chú cảnh sát lên xe mỗi trạm', slotName: 'Chú cảnh sát', kid: 'chú cảnh sát', icon: '👮', siren: true },
  ambulance: { name: 'Xe cứu thương', short: 'Cứu thương', emoji: '🚑', route: 'train', stop: 'Trạm', ctx: 'xe cứu thương', track: 'road', slotTitle: 'Số bác sĩ lên xe mỗi trạm', slotName: 'Bác sĩ', kid: 'bác sĩ', icon: '🩺', siren: true },
  fire: { name: 'Xe cứu hoả', short: 'Cứu hoả', emoji: '🚒', route: 'train', stop: 'Trạm', ctx: 'xe cứu hoả', track: 'road', slotTitle: 'Số chú lính cứu hoả lên xe mỗi trạm', slotName: 'Lính cứu hoả', kid: 'chú lính cứu hoả', icon: '🧯', siren: true }
};
export const SEAT_KINDS = ['car', 'taxi', 'police', 'ambulance', 'fire'];
export const OUTFIT = { police: { cloth: 0x2b4c8c, cap: 0x1d3557, pants: 0x1d3557 }, ambulance: { cloth: 0xffffff, cap: 0xffffff, pants: 0x90caf9 }, fire: { cloth: 0xe9a23b, cap: 0xd62828, pants: 0x5d4037 } };

// Cảnh vật: màu đất + đồ vật rải theo mỗi đoạn 60 đơn vị: [loại, số lượng, khoảng cách gần, xa]
export const BIOMES = {
  oldcity: { ground: 0xb4bf9c, items: [['tube', 26, 9, 55], ['tree', 10, 8, 50], ['tube', 14, 55, 110], ['moto', 3, 9, 40]] },
  town: { ground: 0xa9c58d, items: [['tube', 12, 9, 50], ['house', 6, 12, 80], ['tree', 12, 8, 90], ['field', 4, 40, 120], ['tank', 0, 0, 0]] },
  paddy: { ground: 0x93cf62, items: [['field', 14, 7, 120], ['bamboo', 7, 10, 110], ['house', 4, 18, 110], ['tree', 8, 12, 130], ['buffalo', 1, 12, 50], ['farmer', 2, 9, 50], ['pole', 0, 0, 0]] },
  karst: { ground: 0x88c464, items: [['karst', 9, 30, 160], ['field', 8, 7, 80], ['bamboo', 5, 10, 90], ['tree', 7, 10, 110], ['farmer', 1, 9, 40]] },
  hills: { ground: 0x8cc06a, items: [['hill', 5, 40, 170], ['tree', 22, 8, 130], ['house', 3, 15, 90], ['field', 3, 10, 70]] },
  coast: { ground: 0xa4cf78, sea: true, items: [['palm', 14, 8, 55], ['house', 4, 12, 70], ['sandstrip', 1, 0, 0], ['boat', 3, 0, 0], ['tree', 6, 14, 120], ['hill', 2, 60, 170]] },
  coasttown: { ground: 0xb2c99a, sea: true, items: [['tube', 12, 9, 50], ['palm', 10, 8, 50], ['sandstrip', 1, 0, 0], ['boat', 3, 0, 0], ['tree', 5, 12, 90]] },
  coastcity: { ground: 0xb7c5a8, sea: true, items: [['high', 9, 18, 110], ['tube', 10, 9, 45], ['palm', 10, 8, 45], ['sandstrip', 1, 0, 0], ['boat', 4, 0, 0]] },
  citadel: { ground: 0x9fcf74, items: [['house', 6, 12, 80], ['tree', 14, 8, 110], ['field', 6, 20, 110], ['tube', 6, 9, 40]] },
  dry: { ground: 0xd9c38c, items: [['cactus', 14, 7, 90], ['grape', 6, 10, 70], ['turbine', 2, 40, 160], ['shrub', 14, 7, 120], ['house', 2, 15, 70]] },
  dragonfruit: { ground: 0xd4b882, items: [['dragon', 8, 8, 70], ['dune', 3, 50, 160], ['palm', 5, 8, 60], ['house', 2, 14, 60]] },
  rubber: { ground: 0x8fbf6a, items: [['rubber', 6, 8, 120], ['house', 3, 12, 60], ['tree', 4, 10, 60]] },
  hcm: { ground: 0xaab59f, items: [['high', 16, 12, 130], ['tube', 22, 9, 55], ['tree', 12, 8, 60], ['moto', 3, 9, 40]] },
  hcm2: { ground: 0xa7b99a, items: [['apart', 9, 14, 120], ['tube', 14, 9, 55], ['tree', 14, 8, 80]] },
  park: { ground: 0x8fcf6a, items: [['tree', 34, 7, 120], ['pond', 1, 25, 60], ['high', 4, 70, 150], ['bench', 4, 8, 30]] },
  villa: { ground: 0x93cc6c, items: [['villa', 6, 14, 80], ['palm', 8, 8, 70], ['tree', 20, 8, 110]] },
  tech: { ground: 0xa3cc84, items: [['factory', 4, 18, 110], ['tree', 14, 8, 100], ['apart', 2, 60, 140]] },
  campus: { ground: 0x9ccf7a, items: [['campus', 4, 16, 100], ['tree', 22, 8, 110]] },
  amuse: { ground: 0xa6cf86, items: [['tree', 14, 8, 90], ['stall', 5, 10, 50], ['apart', 3, 60, 140]] }
};
