---
title: "Xiaomi手机安装面具（ROOT）步骤"
date: 2023-09-12T15:27:00.000Z
updated: 2023-09-12T15:29:00.000Z
categories:
  - "手机"
  - "技术"
tags:
  - "手机"
  - "技术"
notion_url: "https://app.notion.com/p/Xiaomi-ROOT-ee6c2b12699f4d3695c1c3fa1d6b2ea4"
---

基本分为以下三步：

1、解锁手机BL锁（**备份好数据，会清除手机数据**）

2、安装magisk软件并刷入magisk

3、刷机或者安装自己需要的模块

一、解锁手机BL锁：这个建议使用小米官方解锁工具解锁，新手不建议使用网上各种秒解锁工具

对于小米用户来说，这是一个非常简单的事情

首先进入

[http://www.miui.com/unlock/index.html](https://link.zhihu.com/?target=http%3A%2F%2Fwww.miui.com%2Funlock%2Findex.html)，按照官网的教程申请解锁即可。

何进入开发者选项，依次点击设置-我的设备-全部参数找到MIUI版本，连续点击后就会提示已开启开发者模式

如何进入fast boot模式，关机状态下同时按住音量下和关机键即可

![图片](/images/notion/ee6c2b12699f4d3695c1c3fa1d6b2ea4/e949c86fdeeaf774.webp)

二、安装magisk软件并刷入magisk

① 下载最新版magiskmanager软件安装到手机上

② 下载好当前版本官方**未解密**完整包（注意是未解密）

首先在系统更新选择下载完整包，然后停止下载

![图片](/images/notion/ee6c2b12699f4d3695c1c3fa1d6b2ea4/d7208bf990bdb2a1.webp)

然后去“下载管理”继续下载，这样就不会被系统解密了，下载好的包在Download\downloaded_rom 就可以找到了

![图片](/images/notion/ee6c2b12699f4d3695c1c3fa1d6b2ea4/61816fe93e3d411c.webp)

③ 用MT 管理器（这个可以自己网上下载也可以私信我要下载链接）打开完整包，把**boot.img**提取出来，右侧记得选一个自己容易找到的解压位置

![图片](/images/notion/ee6c2b12699f4d3695c1c3fa1d6b2ea4/1968731fdd4b9bc1.webp)

④ 打开已经安装好的Magisk Manager，首先选择设置-更新通道，更改为测试版；然后回到主页面，选择安装-选择修补一个文件-找到并选择你刚提取的boot.img文件，安装后出现以下界面表示成功了

![图片](/images/notion/ee6c2b12699f4d3695c1c3fa1d6b2ea4/12c50fb1ffc812e4.webp)

⑤ MT浏览器查看在你原来的下载目录下会生成一个 magisk_patched_xxx.img 的文件（文件名可能会有差异）将他它改名为magisk_patched，将这个文件拷贝到电脑上，下载Flash Boot 通刷包解压，把改名的magisk_patched文件复制替换进来

![图片](/images/notion/ee6c2b12699f4d3695c1c3fa1d6b2ea4/1847bfbd4c28e145.webp)

⑥ 将手机重启至fast boot模式，然后数据线连接电脑，双击“打开CMD命令行”，在CMD窗口内输入以下命令:

非A/B 分区机型：

fastboot flash boot magisk_path.img

A/B机型（如小米11）要刷两次：

fastboot flash boot_a magisk_path.img

fastboot flash boot_b magisk_path.img

等待窗口内出现两个OK字样就完成了，拔掉数据线重启手机即可。

至此就完成小米手机刷面具ROOT操作了
