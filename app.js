var cheerio = require('cheerio');
var http=require('http');
var request = require('request');
var fs= require('fs');
var path = require('path');

var JsonObj=JSON.parse(fs.readFileSync(__dirname+'/Config.json'));
var start=JsonObj.begin;
var end=JsonObj.end;
var ip=JsonObj.centerIP;
var type=JsonObj.type;


function find() {
  request('http://www.in66.com/photo/detail?id=' + start, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      try {
        var $ = cheerio.load(body, {decodeEntities: false});
        if ($('body').attr("data-photo-rec") == undefined)next();
        else {
          console.log(start);
          var userInfo = {id: $('.name').attr("href").substr(10), name: $('.name').html()};
          //判断库中是否已经存在
          request("http://" + ip + "/exists?uid=" + userInfo.id, function (error2, response2, body2) {
            if (!error2 && response2.statusCode == 200) {
              if (body2 != "0")next();
              else {
                request('http://www.in66.com/user?uid=' + userInfo.id, function (error1, response1, body1) {
                  if (!error1 && response1.statusCode == 200) {
                    try {
                      $ = cheerio.load(body1, {decodeEntities: false});
                      if ($('body').attr("data-photo-rec") == undefined) next();
                      else {
                        //将万转为数字
                        var z = 0;
                        var temp = $('.cp-circle .num').eq(2).html();
                        if (temp.indexOf("万") != -1) {
                          z = parseInt(parseFloat(temp.replace('万', '') * 10000));
                        } else {
                          z = parseInt($('.cp-circle .num').eq(2).html());
                        }
                        var us = {
                          pid: start,
                          id: userInfo.id,
                          name: userInfo.name,
                          inid: $('.cp-in-number span').html(),
                          image: $('.cp-avatar').attr('src'),
                          address: $('.cp-address span').html(),
                          sign: $('.cp-intro p').html(),
                          pictures: parseInt($('.cp-circle .num').first().html()),
                          fans: parseInt($('.cp-circle .num').eq(1).html()),
                          zans: z,
                          level: parseInt($('.vc-name span').html().replace('Lv ', '')),
                          time: new Date(),
                        }
                        PostData(us);
                        next();
                      }
                    } catch (ee) {
                      next();
                    }
                  } else {
                    next();
                  }
                });
              }
            } else {
              next();
            }
          });
        }
      } catch (e) {
        next();
      }
    }
    else {
      next();
    }
  });
};

function next() {
  start = start + 2;
  if (start > end) {
    console.log("执行到" + end + "号，任务完成");
    return;
  } else {
    find();
  }
}

function PostData(us) {
  var options = {
    headers: {"Connection": "close"},
    url: "http://" + ip + '/insert',
    method: 'POST',
    json: true,
    body: us
  };
  function callback(error, response, data) {
    if (!error && response.statusCode == 200) {
      console.log(start + "号找到【" + us.name + "】" + new Date());
    }
  }
  request(options, callback);
}


function updateUser() {
  request("http://" + ip + "/emptyUser", function (err, res, body) {
    if (body != null && body.length > 0) {
      for (var i = 0; i < body.length; i++) {
        var finished = false;
        request('http://www.in66.com/user?uid=' + body[i].id, function (error1, response1, body1) {
          if (!error1 && response1.statusCode == 200) {
            try {
              $ = cheerio.load(body1, {decodeEntities: false});
              if ($('body').attr("data-photo-rec") == undefined) next();
              else {
                //将万转为数字
                var z = 0;
                var temp = $('.cp-circle .num').eq(2).html();
                if (temp.indexOf("万") != -1) {
                  z = parseInt(parseFloat(temp.replace('万', '') * 10000));
                } else {
                  z = parseInt($('.cp-circle .num').eq(2).html());
                }
                var us = {
                  id: body[i].id,
                  name: body[i].name,
                  inid: $('.cp-in-number span').html(),
                  image: $('.cp-avatar').attr('src'),
                  address: $('.cp-address span').html(),
                  sign: $('.cp-intro p').html(),
                  pictures: parseInt($('.cp-circle .num').first().html()),
                  fans: parseInt($('.cp-circle .num').eq(1).html()),
                  zans: z,
                  level: parseInt($('.vc-name span').html().replace('Lv ', '')),
                  time: new Date(),
                }
                PostData(us);
                finished = true;
              }
            } catch (ee) {
              finished = true;
            }
          } else {
            finished = true;
          }
        });
      }
      while (finished === false) {
      }
    }
  });
}


//定时检查，如果停止了则重新启动
var now=start;
if(type===0) {
  setInterval(function () {
    now = start;
    setTimeout(function () {
      if (now === start) {
        if (start < end)
          next();
      }
    }, 10000);
    JsonObj.begin = start;
    fs.writeFile(__dirname + '/Config.json', JSON.stringify(JsonObj));
  }, 30000);
  find();
}
else {
  updateUser();
}


