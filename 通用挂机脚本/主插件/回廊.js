var Async = require('async');
var sellStore = require('./../公共模块/里堡卖石');
var teamMode = require('./../公共模块/组队模式');
var logbackEx = require('./../公共模块/登出防卡住');

var cga = global.cga;
var configTable = global.configTable;
var sellStoreArray = ['不卖石', '卖石'];

var interrupt = require('./../公共模块/interrupt');

var moveThinkInterrupt = new interrupt();
var playerThinkInterrupt = new interrupt();
var playerThinkRunning = false;

var moveThink = (arg)=>{

	if(moveThinkInterrupt.hasInterrupt())
		return false;

	if(arg == 'freqMoveMapChanged')
	{
		playerThinkInterrupt.requestInterrupt();
		return false;
	}

	return true;
}

var playerThink = ()=>{

	if(!cga.isInNormalState())
		return true;
	
	var playerinfo = cga.GetPlayerInfo();
	var ctx = {
		playerinfo : playerinfo,
		petinfo : playerinfo.petid >= 0 ? cga.GetPetInfo(playerinfo.petid) : null,
		teamplayers : cga.getTeamPlayers(),
		result : null,
		dangerlevel : thisobj.getDangerLevel(),
	}

	teamMode.think(ctx);

	global.callSubPlugins('think', ctx);

	if(cga.isTeamLeaderEx())
	{
		console.log(ctx.result);
		
		if(ctx.result == null && playerThinkInterrupt.hasInterrupt())
			ctx.result = 'supply';

		if( ctx.result == 'supply' || ctx.result == 'logback' )
		{
			moveThinkInterrupt.requestInterrupt(()=>{
				if(cga.isInNormalState()){
					logbackEx.func(loop);
					return true;
				}
				return false;
			});
			return false;
		}
	}

	return true;
}

var playerThinkTimer = ()=>{
	if(playerThinkRunning){
		if(!playerThink()){
			console.log('playerThink off');
			playerThinkRunning = false;
		}
	}
	
	setTimeout(playerThinkTimer, 1500);
}

var loop = ()=>{

	var map = cga.GetMapName();
	var mapindex = cga.GetMapIndex().index3;
	
	if(cga.isTeamLeaderEx())
	{
		if(map == '过去与现在的回廊')
		{
			if(!teamMode.is_enough_teammates())
			{
				//人没满
				if(cga.isTeamLeader == true)
				{
					//队长等待队员
					cga.WalkTo(11, 20);
					teamMode.wait_for_teammates(loop);
					return;
				}
				else
				{
					//队员等待加队长
					cga.WalkTo(10, 20);
					teamMode.wait_for_teammates(loop);
					return;
				}
			}
			else
			{
				console.log('playerThink on');
				playerThinkRunning = true;
				//队长：人满了，开始遇敌
				cga.freqMove(0);
				return;
			}
		}
	} else {
		//进队了
		console.log('playerThink on');
		playerThinkRunning = true;
		return;
	}

	if(cga.needSupplyInitial())
	{
		cga.travel.falan.toCastleHospital(()=>{
			setTimeout(loop, 5000);
		});
		return;
	}
	
	callSubPluginsAsync('prepare', ()=>{
	
		if(map != '里谢里雅堡'){
			cga.travel.falan.toStone('C', loop);
			return;
		}
		
		if(cga.getSellStoneItem().length > 0)
		{
			sellStore.func(loop);
			return;
		}
		
		cga.walkList([
		[52, 72]
		], ()=>{
			cga.TurnTo(54, 72);
			cga.AsyncWaitNPCDialog(()=>{
				cga.ClickNPCDialog(32, 0);
				cga.AsyncWaitNPCDialog(()=>{
					cga.ClickNPCDialog(4, 0);
					cga.AsyncWaitNPCDialog(()=>{
						cga.ClickNPCDialog(4, 0);
						cga.AsyncWaitMovement({map:'过去与现在的回廊', delay:1000, timeout:5000}, loop);
					});
				});
			});
		});	
	});
}

var thisobj = {
	getDangerLevel : ()=>{
		var map = cga.GetMapName();
		
		if(map == '过去与现在的回廊' )
			return 2;
		
		return 0;
	},
	translate : (pair)=>{
		
		if(pair.field == 'sellStore'){
			pair.field = '是否卖石';
			pair.value = pair.value == 1 ? '卖石' : '不卖石';
			pair.translated = true;
			return true;
		}
				
		if(teamMode.translate(pair))
			return true;
		
		return false;
	},
	loadconfig : (obj)=>{

		if(!teamMode.loadconfig(obj))
			return false;
		
		configTable.sellStore = obj.sellStore;
		thisobj.sellStore = obj.sellStore
		
		if(thisobj.sellStore == undefined){
			console.error('读取配置：是否卖石失败！');
			return false;
		}
		
		return true;
	},
	inputcb : (cb)=>{
		Async.series([sellStore.inputcb, teamMode.inputcb, (cb2)=>{
			var sayString = '【回廊插件】请选择是否卖石: 0不卖石 1卖石';
			cga.sayLongWords(sayString, 0, 3, 1);
			cga.waitForChatInput((msg, val)=>{
				if(val !== null && val >= 0 && val <= 1){
					configTable.sellStore = val;
					thisobj.sellStore = val;
					
					var sayString2 = '当前已选择:'+sellStoreArray[thisobj.sellStore]+'。';
					cga.sayLongWords(sayString2, 0, 3, 1);
					
					cb2(null);
					
					return false;
				}
				
				return true;
			});
		}], cb);
	},
	execute : ()=>{
		playerThinkTimer();
		cga.registerMoveThink(moveThink);
		callSubPlugins('init');
		logbackEx.init();
		loop();
	},
};

module.exports = thisobj;