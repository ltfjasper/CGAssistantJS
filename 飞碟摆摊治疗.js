var cga = require('./cgaapi')(function(){
	
	var loop = ()=>{
		
		var skill = cga.findPlayerSkill('治疗');
		
		if(!skill)
		{
			throw new Error('没有治疗技能！');
		}
		
		var requiremp = 25 + skill.lv * 5;
		
		//补魔
		if (cga.GetPlayerInfo().mp < requiremp){
			cga.walkList([
			[34, 89],
			], ()=>{
				cga.TurnTo(35, 88);
				setTimeout(()=>{
					cga.walkList([
					[29, 85],
					], ()=>{
						cga.turnTo(28, 85);
						loop();
					});
				}, 3000);
			})
			
			return;
		}
		
		//寻找队伍里带拐杖的玩家
		
		var teamplayers = cga.getTeamPlayers();
		
		var index = -1;
		
		for(var i in teamplayers){
			if(teamplayers[i].injury){
				index = i;
				break;
			}
		}

		//找到了
		if(index != -1)
		{
			cga.StartWork(skill.index, skill.lv-1);
			cga.AsyncWaitPlayerMenu((err, players)=>{
				
				if(players){
					for(var i in players){
						if(players[i].name == teamplayers[index].name){
							
							cga.AsyncWaitUnitMenu((err, units)=>{
								cga.AsyncWaitWorkingResult(()=>{
									loop();
								});
								cga.UnitMenuSelect(0);
							});
							cga.PlayerMenuSelect(i);
							break;
						}
					}
					return;
				}
				
				setTimeout(loop, 1000);
			});
			return;
		}
		
		//说话防掉线
		cga.SayWords('', 0, 3, 1);
		setTimeout(loop, 1000);
	}
	
	loop();
});