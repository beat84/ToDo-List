var todo = {
	debug : false,
	lang : "en"
}

todo.isDad = function(child){
	child.parent = this;
	return true;
}

todo.init = function(id, element){
	this.who = id;
	this.element = element;
	this.isDad(this.db);
	if(id!="detail"){
		this.db.start();
	}
	return true;
}

todo.list = function(type){
	if(type=="complete"){
		//bb.popScreen();
		bb.pushScreen('complete.htm', 'complete');
	}else if(type=="uncomplete"){
		//bb.popScreen();
		bb.pushScreen('uncomplete.htm', 'uncomplete');
	}
	return true;
}

todo.managing = function(id){
	this.working_task = id;
	bb.pushScreen('detail.htm', 'detail');
	return true;
}

todo.add = function(value){
	if(typeof(value)=="undefined" || value==""){
		return false;
	}
	//add value
	this.db.isFirstLaunch = false;
	this.db.insert_data(value);
	
	return true;
}

todo.complete = function(){
	this.db.open();
	this.db.update_data(this.working_task);
	bb.pushScreen('complete.htm', 'complete');
	return true;
}

todo.remove = function(){
	this.db.open();
	this.db.remove_data(this.working_task);
	bb.pushScreen('uncomplete.htm', 'uncomplete');
	return true;
}

todo.db = {
	lives: 2,
	isFirstLaunch: false
}

todo.db.start = function(){
	try {
		this.open();

		if(!this.link){
			//console.log("UD : Failed to open the database on disk. This is probably because the version was bad or there is not enough space left in this domain's quota");
			blackberry.app.exit();
		}

		// Load data from the database.
		var database = this.link;
		var _self = this;
		if(!this.isFirstLaunch){
			database.transaction(function(tx) {
				_self.parent.create_list(tx);
			}, function(/*SQLError*/ error){
				todo.db.init(database);
			});
		}

	} catch(ex) {
		if(ex == 2){
			// Version number mismatch.
			//console.log("Invalid database version.");
		}else{
			//console.log("Unknown error "+ex+".");
		}
		//blackberry.app.exit();
	}
}

todo.db.init = function(database){
	this.isFirstLaunch = true;
	var _self = this;
	database.transaction(_self.create, function(/*SQLException*/ e){
		if(--this.lives > 0){
			//console.log(e.message + "\n" + this.lives + " attempts remaining.");
			_self.init(database);
		}else{
			//console.log(e.message + "\nIssues with DB initialization.");
			blackberry.app.exit();
		}
	});
	return true;
}


todo.db.create = function(tx){
	//id	add_date	task	status[0=uncomplete,1=completed]
	tx.executeSql("CREATE TABLE tbl_list(id INTEGER PRIMARY KEY ASC, add_date DATETIME, task TEXT, status INTEGER)", null, null); //todo.db.callback, sqlFail);
	this.isFirstLaunch = false;
	return true;
}

todo.db.open = function(){
	if(this.link){
		return true;
	}
	
	if (!window.openDatabase) {
		//console.log("No DB compatibility.");
		return false;
	}

	try{
		this.link = openDatabase("todo_list", "1.0", "ToDo List DB", 10*1024*1024);
		return true;
	}
	catch(e){
		//console.log("DB issues");
		return false;
	}
}

todo.db.insert_data = function(task){
	var database = this.link;
	var _self = this;
	database.transaction(function(tx){
		var date = new Date();
		date = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate();
		tx.executeSql("INSERT INTO tbl_list (add_date, task, status) VALUES (\""+date+"\", \""+task+"\", "+0+")");
		_self.parent.list("uncomplete");
	}, function(e){
		//console.log("Issue with insert into DB - "+e);
	});
}

todo.db.update_data = function(id){
	var database = this.link;
	database.transaction(function(tx) {
		tx.executeSql("UPDATE tbl_list SET status = 1 WHERE id = ?", [id]);
	}, function(e){
		//console.log("Issue with update data into DB - "+e);
	});
}

todo.db.remove_data = function(id){
	var database = this.link;
	database.transaction(function(tx){
		tx.executeSql("DELETE FROM tbl_list WHERE id=?", [id]);
	}, function(e){
		//console.log("Issue with removing data from DB - "+e);
	});
}

todo.db.load_data = function(tx, who){
	var _self = this;
	tx.executeSql("SELECT * FROM tbl_list WHERE status="+who, null, function(tx, rs){
		_self.parent.append_data(tx, rs);
	});
	return true;
}

todo.convert_status = function(who){
	if(who=="complete"){
		return 1;
	}else if(who=="uncomplete"){
		return 0;
	}
	return false;
}

todo.create_list = function(tx){
	this.db.load_data(tx, this.convert_status(this.who));
}

todo.append_data = function(tx, rs){
	var rows = rs.rows;
	var el = this.element;
	if(rows.length==0 && this.convert_status(this.who)==1){
		var item = document.createElement('div');
		item.setAttribute("id", "no_task_message");
		item.setAttribute("data-bb-type", "round-panel");
		item.setAttribute("style", "margin-top:10px;");
		
		var item2 = document.createElement('p');
		item2.setAttribute("style", "text-align:center;");
		item2.innerHTML = 'No completed tasks yet!';
		
		el.getElementById(this.who).appendItem(item2);

		return false;
	}
	for(var i=0; i < rows.length; i++){
		var row = rows.item(i);
		var item = document.createElement('div');
		item.setAttribute("data-bb-type", "item");
		item.setAttribute("data-id", row.id);
		item.setAttribute("data-bb-title", row.task);
		if(todo.convert_status(this.who)==0){
			item.setAttribute("onclick", "todo.managing('"+row.id+"');")
		}
		item.setAttribute("data-bb-img", this.who+".png");
		el.getElementById(this.who).appendItem(item);
	}
	
}