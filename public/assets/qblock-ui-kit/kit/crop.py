from PIL import Image
import numpy as np, json, os
U='/mnt/user-data/uploads/'
S={'po':Image.open(U+'blockfort_player_operation.png').convert('RGBA'),
   'mu':Image.open(U+'blockfort_manor_upgrade.png').convert('RGBA'),
   'st':Image.open(U+'blockfort_store.png').convert('RGBA')}
# (sheet, folder/name, rect x0,y0,x1,y1, opts)
C=[
('po','buttons/btn-build',(128,0,338,57)),
('po','buttons/btn-mail',(128,64,338,121)),
('po','buttons/btn-remove',(0,321,212,378)),
('po','buttons/btn-home',(0,589,212,647)),
('po','plates/plate-gold',(0,0,127,34)),
('po','plates/plate-red',(0,63,127,100)),
('po','misc/avatar-monster',(338,0,404,66)),
('po','panels/panel-small',(0,120,306,322),'gray'),
('po','panels/panel-tall',(212,321,438,591),'gray'),
('mu','icons/arrow-chevron',(0,0,66,74)),
('mu','plates/plate-title',(74,0,240,48)),
('mu','buttons/btn-close',(247,0,310,63)),
('mu','icons/gem',(310,0,338,32)),
('mu','panels/note-card-a',(338,0,662,252)),
('mu','islands/island-snow-1',(678,18,836,132)),
('mu','islands/island-grass-1',(860,16,1022,136)),
('mu','islands/island-mixed-1',(1040,2,1215,142)),
('mu','islands/island-grass-2',(1226,0,1404,140)),
('mu','islands/island-snow-2',(1410,0,1594,146)),
('mu','islands/island-forest',(1597,0,1782,148)),
('mu','islands/island-lake',(1783,0,1966,150)),
('mu','misc/slot-tan',(1968,0,2048,78)),
('mu','misc/divider-left',(0,255,290,270)),
('mu','misc/divider-right',(1630,255,1925,270)),
('mu','icons/coin',(287,255,322,290)),
('mu','panels/note-card-b',(320,255,644,508)),
('mu','panels/panel-large-manor',(642,255,1636,788)),
('mu','plates/banner-crown',(0,784,376,886)),
('st','misc/fade-bar',(0,0,192,30)),
('st','icons/icon-arrow-up',(198,0,226,28)),
('st','icons/icon-bomb',(226,0,252,28)),
('st','icons/icon-heart',(256,0,284,28)),
('st','icons/icon-cube',(285,0,313,28)),
('st','misc/fade-strip',(312,0,874,50)),
('st','plates/plate-title-2',(874,0,1056,48)),
('st','misc/tile-brick',(1058,0,1162,60)),
('st','misc/tile-cream',(1164,0,1269,60)),
('st','buttons/btn-close-2',(1269,0,1331,64)),
('st','plates/ribbon-grey',(1329,0,1465,74)),
('st','plates/ribbon-gold',(1467,0,1601,74)),
('st','misc/slot-frame',(1603,0,1704,104)),
('st','misc/slot-selected',(0,101,102,203)),
('st','misc/slot-locked',(104,101,204,203)),
('st','plates/banner-buildings',(203,101,419,228)),
('st','panels/panel-tall-store',(418,100,702,548)),
('st','panels/panel-large-store',(704,100,1787,646)),
]
man={}
for c in C:
    sh,name,r=c[:3]; opt=c[3] if len(c)>3 else ''
    im=S[sh].crop(r)
    a=np.array(im)
    if opt=='gray':
        m=(abs(a[...,0].astype(int)-117)<5)&(abs(a[...,1].astype(int)-117)<5)&(abs(a[...,2].astype(int)-117)<5)
        a[m,3]=0
    if sh=='st' and name=='misc/fade-bar': a[:9,:9,3]=0
    if name in('icons/icon-arrow-up',) : pass
    im=Image.fromarray(a)
    bb=im.getchannel('A').point(lambda v:255 if v>8 else 0).getbbox()
    im=im.crop(bb)
    p=f'assets/{name}.png'; im.save(p)
    man[name]={'file':p,'w':im.width,'h':im.height,'source':sh,'src_rect':[r[0]+bb[0],r[1]+bb[1],r[0]+bb[2],r[1]+bb[3]]}
json.dump(man,open('assets/manifest.json','w'),indent=1)
for k,v in man.items(): print(k,v['w'],v['h'])
