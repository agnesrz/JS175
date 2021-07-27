const express = require("express");
const morgan = require("morgan");
const flash = require("express-flash");
const session = require("express-session");
const { body, validationResult } = require("express-validator");
const TodoList = require("./lib/todolist");
const { sortTodoLists, sortTodos } = require("./lib/sort");
const store = require("connect-loki");
const app = express();

const host = "localhost";
const port = 3000;
const LokiStore = store(session);
const Todo = require("./lib/todo");

const removeTodoList = (todoListId, todoLists) => {
  let todoListIdx = todoLists.findIndex(todoList => todoList.id === todoListId);

  todoLists.splice(todoListIdx, 1);
}

app.set("views", "./views");
app.set("view engine", "pug");

app.use(morgan("common"));
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(session({
  cookie: {
    httpOnly: true,
    maxAge: 31 * 24 * 60 * 60 * 1000, // 31 days in millseconds
    path: "/",
    secure: false,
  },
  name: "launch-school-todos-session-id",
  resave: false,
  saveUninitialized: true,
  secret: "this is not very secure",
  store: new LokiStore({}),
}));

app.use(flash());

// Set up persistent session data
app.use((req, res, next) => {
  let todoLists = [];
  if ("todoLists" in req.session) {
    req.session.todoLists.forEach(todoList => {
      todoLists.push(TodoList.makeTodoList(todoList));
    });
  }

  req.session.todoLists = todoLists;
  next();
});

app.use((req, res, next) => {
  res.locals.flash = req.session.flash;
  delete req.session.flash;
  next();
});

app.use((err, req, res, _next) => {
  console.log(err);
  res.status(404).send(err.message);
});

const loadTodoList = (todoListId, todoLists) => {
  return todoLists.find(todoList => todoList.id === todoListId);
};

// I added this
const loadTodo = (todoList, todoId, todoLists) => {
  return todoList.todos.find(todo => todo.id === Number(todoId));
};

app.get("/", (req, res) => {
  res.redirect("/lists");
});

app.get("/lists/new", (req, res) => {
  res.render("new-list");
});

app.post("/lists",
  [
    body("todoListTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The list title is required.")
      .isLength({ max: 100 })
      .withMessage("List title must be between 1 and 100 characters.")
      .custom((title, { req }) => {
        let todoLists = req.session.todoLists;
        let duplicate = todoLists.find(list => list.title === title);
        return duplicate === undefined;
      })
      .withMessage("List title must be unique."),
  ],
  (req, res) => {
    let errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render("new-list", {
        flash: req.flash(),
        todoListTitle: req.body.todoListTitle,
      });
    } else {
      let todoLists = req.session.todoLists;
      todoLists.push(new TodoList(req.body.todoListTitle));
      req.flash("success", "The todo list has been created.");
      res.redirect("/lists");
    }
  }
);

app.get("/lists", (req, res) => {
  res.render("lists", {
    todoLists: sortTodoLists(req.session.todoLists),
  });
});

app.get("/lists/:todoListId", (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId, req.session.todoLists);
  if (todoList === undefined) {
    next(new Error("Not found."));
  } else {
    res.render("list", {
      todoList: todoList,
      todos: sortTodos(todoList),
    });
  }
});

app.get("/lists/:todoListId/edit", (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId, req.session.todoLists);

  if (!todoList) {
    next(new Error("Not found."));
  } else {
    res.render("edit-list", {todoList: todoList});
  }
});

app.post("/lists/:todoListId/todos/:todoId/toggle", (req, res) => {
  let todoLists = req.session.todoLists;
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId, todoLists);
  let todoId = req.params.todoId;
  let todo = loadTodo(todoList, todoId, todoLists);

  if (!todo || !todoList) {
    next(new Error("Not found."));
  } else {   
    todo.isDone() ? todo.markUndone() : todo.markDone();
    req.flash("success", `Your task has been marked ${todo.isDone() ? 'done' : 'undone'}.`);
    res.redirect(`/lists/${todoListId}/`);
  }
});

app.post("/lists/:todoListId/complete_all", (req, res) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId, req.session.todoLists);

  if (!todoList) {
    next(new Error('Not found.'));
  } else {
    todoList.markAllDone();
    req.flash("success", "All tasks have been marked done.");
    res.redirect(`/lists/${todoListId}`);
  }
})

app.post("/lists/:todoListId/todos",
  [
    body("todoTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("Todo must be between 1 and 100 characters.")
      .isLength({ max: 100 })
      .withMessage("Todo must be between 1 and 100 characters.")
  ],
  (req, res, next) => {
    let todoListId = req.params.todoListId;
    let todoList = loadTodoList(+todoListId, req.session.todoLists);
    let errors = validationResult(req);

    if (!todoList) {
      next(new Error('Not found.'));      
    } else if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));

      res.render("list", {
        flash: req.flash(),
        todoList: todoList,
        todos: sortTodos(todoList),
        todoTitle: req.body.todoTitle,
      });
    } else {
      let todo = new Todo(req.body.todoTitle);
      todoList.add(todo);
      req.flash("sucess", "The todo has been created.");
      res.redirect(`/lists/${todoListId}`);
    }
  });

app.post("/lists/:todoListId/destroy", (req, res, next) => {
  let todoListId = req.params.todoListId;
  let todoList = loadTodoList(+todoListId, req.session.todoLists);
  
  if (!todoList) {
    next(new Error('Not found.'));
  } else {
    removeTodoList(todoListId, req.session.todoLists);
    req.flash("sucess", "The todo list has been deleted.");
    res.redirect("/lists");
  }
});
// stopped here
app.post("/lists/:todoListId/edit",
  [
    body("todoListTitle")
      .trim()
      .isLength({ min: 1 })
      .withMessage("The new title must be between 1 and 100 characters.")
      .isLength({ max: 100 })
      .withMessage("List title must be between 1 and 100 characters.")
      .custom((title, { req }) => {
        let todoLists = req.session.todoLists;
        let duplicate = todoLists.find(list => list.title === title);
        return duplicate === undefined;
      })
      .withMessage("List title must be unique."),
  ],
  (req, res, next) => {
    let todoListId = req.params.todoListId;
    let todoList = loadTodoList(+todoListId, req.session.todoLists);
    let errors = validationResult(req);

    if (!todoList) {
      next(new Error('Not found.'));
    } 
    
    else if (!errors.isEmpty()) {
      errors.array().forEach(message => req.flash("error", message.msg));
      res.render("edit-list", {
        flash: req.flash(),
        todoListTitle: req.body.todoListTitle,
        todoList: todoList
      });
    } else {
      todoList.setTitle(req.body.todoListTitle);
      req.flash("success", "The todo list title has been updated.");
      res.redirect(`/lists/${todoListId}`);
    }
  });

app.listen(port, host, () => {
  console.log(`Todos is listening on port ${port} of ${host}!`);
});