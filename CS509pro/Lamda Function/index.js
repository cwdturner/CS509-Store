const mysql = require('mysql');
const db_access = require('/opt/nodejs/db_access')

exports.handler = async (event) => {
var pool = mysql.createPool({// credentials from db_access layer (loaded separately via console)
host: db_access.config.host,
user: db_access.config.user,
password: db_access.config.password,
database: db_access.config.database
});

let GetStoresAndInventoryAmount = () => {

return new Promise((resolve, reject) => {
pool.query("SELECT Stores.storeName, Stores.store_id, latitude, longitude, balance, COALESCE(SUM(price), 0) as 'Total_Price' From Stores left join Computers on Stores.store_id = Computers.store_id GROUP BY Stores.storeName ORDER BY Stores.storeName", (error, rows) => {
if (error) { return reject(error); }
if ((rows) && rows.length > 0) {
	return resolve(rows);
} else {
	return reject("No Results Returned.");
}
});
});
}

let removeStore = (value) => {
return new Promise((resolve, reject) => {
pool.query("DELETE FROM Stores WHERE store_id = ?", [value], (error, rows) => {
if (error) { return reject(error); }
if((rows) && rows.affectedRows > 0){
	return resolve("Store Deleted.");
}
else{
	return resolve("No Stores Deleted.");
}

});
});
}

let createStore = (username_val, password_val, storeName_val, longitude_val, latitude_val) => {
	return new Promise((resolve, reject) => {
	pool.query("SELECT * FROM Logins WHERE username = ?", [username_val], (error, rows) => {
		if (error) { return reject(error); }
		if((rows) && rows.length > 0){
			return resolve("Failure: Username in use.");
		}
		else{
			return resolve(new Promise((resolve, reject) => {
			pool.query("INSERT INTO Stores (storeName, longitude, latitude) VALUES (?,?,?)", [storeName_val, longitude_val, latitude_val], (error, rows) => {
				if (error) { return reject(error); }
				if((rows) && rows.affectedRows > 0){
					var inserted_id = rows.insertId;
					return resolve(new Promise((resolve, reject) => {
					pool.query("INSERT INTO Logins (username, password, store_id) VALUES (?,?,?)", [username_val, password_val, inserted_id], (error, rows) => {
						if (error) { return reject(error); }
						if((rows) && rows.affectedRows > 0){
							var final = {"storeName": storeName_val,"store_id": inserted_id};
							return resolve(final);
						}
					});
					}));
				}
			});
			}));

		}
	});
	});
}

let logInStore = (username_val, password_val) => {
	return new Promise((resolve, reject) => {
	pool.query("SELECT * FROM Logins WHERE username = ? AND password = ?", [username_val, password_val], (error, rows) => {
		if (error) { return reject(error); }
		if((rows) && rows.length > 0){
			var final = {"status": "Success","store_id": rows[0].store_id};
			return resolve(final);
		}
		else{
			var final = {"status": "Failure","message": "Incorrect Login Information Given."};
			return resolve(final);
		}
	});
	});
}

let addComputer = (computerName_val, store_id_val, storeName_val, price_val, processor_val, generation_val, memory_val, storage_val, graphicsCard_val) => {
	var stName = "";
	return new Promise((resolve, reject) => {
		pool.query("SELECT storeName FROM Stores WHERE store_id = ?", [store_id_val], (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				stName = rows[0].storeName;
				return resolve(new Promise((resolve, reject) => {
					pool.query("INSERT INTO Computers (computerName, store_id, storeName, price, processor, generation, memory, storage, graphicsCard) VALUES (?,?,?,?,?,?,?,?,?);", [computerName_val, store_id_val, stName, price_val, processor_val, generation_val, memory_val, storage_val, graphicsCard_val], (error, rows) => {
					//pool.query("INSERT INTO Computers (computerName, store_id, storeName, price, processor, generation, memory, storage, graphicsCard) VALUES ('A PC', 4, 'Cool Comps', '1200.00', 'Intel i7', '12th Gen Intel', '8G', '800G', 'NVIDIA GeForce ');" , (error, rows) => {
					if (error) { return reject(error); }
					if((rows) && rows.affectedRows > 0){
						return resolve("Success: Computer Added.");
					}
					else{
						return reject("Computer Not Added");
					}
					});
				}));
			}
			else{
				return reject("No rows returned.");
			}
		});
		});

}

let removeComputer = (computer_id) => {
	return new Promise((resolve, reject) => {
		pool.query("DELETE FROM Computers WHERE computer_id = ?", [computer_id], (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.affectedRows > 0){
				return resolve(new Promise((resolve, reject) => {
					pool.query("Update SiteManager set sm_balance = sm_balance + 25.00 where sm_id=1;", (error, rows) => {
					if (error) { return reject(error); }
					if((rows) && rows.affectedRows > 0){
						return resolve("Success: Computer Removed");
					}
					else{
						return reject("Computer Not Added");
					}
					});
				}));
			}
			else{
				return resolve("No Computer Deleted.");
			}
		});
	});
}

let editCompPrice = (new_price, computer_id_list) => {
	return new Promise((resolve, reject) => {
		pool.query("UPDATE Computers SET price = ? WHERE computer_id IN (?)", [new_price, computer_id_list], (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.affectedRows > 0){
				return resolve("Prices Updated.");
			}
			else{
				return reject("No Prices Updated");
			}
		});
	});
}

let generateInventory = (store_id_val) => {
	if(store_id_val){
		return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM Computers WHERE store_id = ? ORDER BY store_id", [store_id_val], (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				return resolve(rows);
			}
			else{
				return reject("No rows returned.");
			}
		});
		});
	}
	{
		return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM Computers ORDER BY store_id",  (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				return resolve(rows);
			}
			else{
				return reject("No rows returned.");
			}	
		});
		});
	}
}

let Report_SiteManager_Inventory = () => {
	return new Promise((resolve, reject) => {
		pool.query("SELECT Stores.storeName, Stores.store_id, latitude, longitude, balance, COALESCE(SUM(price), 0) as 'Total_Price' From Stores left join Computers on Stores.store_id = Computers.store_id  GROUP BY Stores.storeName ORDER BY Stores.storeName", (error, rows) => {
			if (error) {
				return reject(error);
			}
			if (rows && rows.length > 0) {
				return resolve(rows);
			} else {
				return reject("No Results Returned. ");
			}
		    
	    });
        });
    }

let SM_GetBalance = () => {

return new Promise((resolve, reject) => {
pool.query("SELECT storeName, balance FROM Stores ORDER BY storeName", (error, rows) => {
if (error) { return reject(error); }
if ((rows) && rows.length > 0) {
	return resolve(rows);
} else {
	return reject("No Results Returned.");
}
});
});
}

let SM_Balance = () => {

return new Promise((resolve, reject) => {
pool.query("SELECT sm_balance FROM SiteManager WHERE sm_id = 1", (error, rows) => {
if (error) { return reject(error); }
if ((rows) && rows.length > 0) {
	return resolve(rows);
} else {
	return reject("No Results Returned.");
}
});
});
}



//gen a list of stores for the cust
let store_list = () => {
	return new Promise((resolve, reject) => {
		pool.query("SELECT storeName FROM Stores ORDER BY storeName", (error, rows) => {
			if (error) {
				return reject(error);
			}
			if (rows && rows.length > 0) {
				return resolve(rows);
			} else {
				return reject("No Results Returned. ");
			}
		    
	    });
        });
    }
    
    
    
    
    
//gen inv based on store for cust
let custGenInv = (store_name,pri,ram,sto,gpu,cpu,gen) => {
	if(store_name){
		console.log("ram"+ram);
		if (store_name=="storeName"){
			var storeSql ="??";	
		}
		else var storeSql ="?";
		//--------------------------------
		if (ram=="memory"){
			var ramSql ="??";
			
		}
		else var ramSql ="?";
		//---------------------------------
		if(pri=="price"){
			var be1 = -1;
			var be2 = 999999999;
		}
		else if(pri=="2000+"){
			var be1 = 2001;
			var be2 = 999999999;
		}
		else if(pri=="1501-2000"){
			var be1 = 1501;
			var be2 = 2000;
		}
		else if(pri=="1001-1500"){
			var be1 = 1001;
			var be2 = 1500;
		}
		else if(pri=="501-1000"){
			var be1 = 501;
			var be2 = 1000;
		}
		else {
			var be1 = -1;
			var be2 = 500;
		}
		//------------------------------------
		
		
		if (sto=="storage"){
			var storageSql ="??";	
		}
		else var storageSql ="?";
		//-------------------------------------------
		
		if (gpu=="graphicsCard"){
			
			var gpuSql ="(graphicsCard = graphicsCard)";
		}
		
		else if 	(gpu=="NVIDIA"){
			var gpuSql ="(graphicsCard = \"NVIDIA GeForce RTX 4090\" or graphicsCard = \"NVIDIA GeForce RTX 4080\")";	
		}
		else if 	(gpu=="AMD"){
			var gpuSql ="(graphicsCard = \"AMD Radeon Pro W6300\" or graphicsCard = \"AMD Radeon Pro W6400\")";	
		}
			else if 	(gpu=="INTEL"){
			var gpuSql ="(graphicsCard = \"Intel Integrated Graphics\" or graphicsCard = \"Intel UHD Graphics 730\" or graphicsCard = \"Intel UHD Graphics 770\")";	
		}
		else if (gpu=="NVIDIA GeForce RTX 4090"){
			
			var gpuSql ="(graphicsCard = \"NVIDIA GeForce RTX 4090\")";
		}
		else if (gpu=="NVIDIA GeForce RTX 4080"){
			
			var gpuSql ="(graphicsCard = \"NVIDIA GeForce RTX 4080\")";
		}
		else if (gpu=="AMD Radeon Pro W6300"){
			
			var gpuSql ="(graphicsCard = \"AMD Radeon Pro W6300\")";
		}
		else if (gpu=="AMD Radeon Pro W6400"){
			
			var gpuSql ="(graphicsCard = \"AMD Radeon Pro W6400\")";
		}
		else if (gpu=="Intel Integrated Graphics"){
			
			var gpuSql ="(graphicsCard = \"Intel Integrated Graphics\")";
		}
		else if (gpu=="Intel UHD Graphics 730"){
			
			var gpuSql ="(graphicsCard = \"Intel UHD Graphics 730\")";
		}
		else if (gpu=="Intel UHD Graphics 770"){
			
			var gpuSql ="(graphicsCard = \"Intel UHD Graphics 770\")";
		}
		else var gpuSql ="(graphicsCard = graphicsCard)";
		
		
		//var test = "="
		return new Promise((resolve, reject) => {
		//pool.query("SELECT * FROM Computers WHERE memory = "+ramSql+" ORDER BY memory", [ram], (error, rows) => {              AND graphicsCard = "+gpuSql+"
		
		//pool.query("SELECT * FROM Computers WHERE storeName = "+storeSql+" AND memory = "+ramSql+" AND price between ? AND ? AND storage = "+storageSql+" AND graphicsCard = "+gpuSql+" ORDER BY storeName", [store_name,ram,be1,be2,sto,gpu], (error, rows) => {
		pool.query("SELECT * FROM Computers WHERE (storeName = "+storeSql+" AND memory = "+ramSql+" AND price between ? AND ? AND storage = "+storageSql+") AND "+gpuSql+" ORDER BY storeName", [store_name,ram,be1,be2,sto], (error, rows) => {
	
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				return resolve(rows);
			}
			else{
				return reject("No rows returned.");
			}
		});
		});
	}
	{
		
		return new Promise((resolve, reject) => {
		pool.query("SELECT * FROM Computers ORDER BY storeName",  (error, rows) => {
			if (error) { return reject(error); }
			if((rows) && rows.length > 0){
				return resolve(rows);
			}
			else{
				return reject("No rows returned.");
			}	
		});
	});	
	}
}



var result;
switch(event.arg1){
	case 'SM_GetStores':
		result = await GetStoresAndInventoryAmount();
	break;

	case 'SM_RemoveStore':
		result = await removeStore(event.store_id);
	break;

	case 'SO_CreateStore':
		result = await createStore(event.username, event.password, event.storeName, parseFloat(event.longitude), parseFloat(event.latitude));
	break;

	case 'SO_AddComputer':
		result = await addComputer(event.computerName, parseInt(event.store_id), event.storeName, parseFloat(event.price), event.processor, event.generation, event.memory, event.storage, event.graphicsCard);
	break;

	case 'SO_RemoveComputer':
		result = await removeComputer(event.computer_id);
	break;

	case 'Generate_Inventory':
		if(event.store_id)
			result = await generateInventory(event.store_id);
		else
			result = await generateInventory(null);
	break;
	case 'Report_SiteManager_Inventory':
		result = await reportSiteManagerInventory();
	break;
	case 'SM_GetBalance':
		result = await SM_GetBalance();
	break;
	case 'SM_Balance':
		result = await SM_Balance();
	break;
	
	case 'store_list':
		result = await store_list();
	break;
	
	case 'SO_Login':
		result = await logInStore(event.username, event.password);
	break;
	
	case 'SO_EditPrice':
		result = await editCompPrice(event.newPrice, event.compIDs);
	break;
	
	case 'custGenInv':
		if(event.store_name)
			result = await custGenInv(event.store_name,event.price,event.memory,event.storage,event.graphicsCard,event.processor,event.generation);
		else
			result = await custGenInv(null);
	break;
		
}


const response = {
statusCode: 200,
body: JSON.stringify(result)
};
return response;
};





